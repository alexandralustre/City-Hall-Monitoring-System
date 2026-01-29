<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\Department;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentController extends Controller
{
    /**
     * List documents with filtering, search, and pagination.
     *
     * Supported query params:
     * - code: partial/full document_code
     * - department_id or department_code
     * - status
     * - type (type_of_document)
     * - date_from, date_to (YYYY-MM-DD)
     * - per_page
     */
    public function index(Request $request)
    {
        $query = Document::with(['department', 'encodedBy'])->orderByDesc('created_at');

        if ($code = $request->get('code')) {
            $query->where('document_code', 'like', '%' . $code . '%');
        }

        if ($departmentId = $request->get('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($departmentCode = $request->get('department_code')) {
            $query->whereHas('department', function ($q) use ($departmentCode) {
                $q->where('code', $departmentCode);
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->get('type')) {
            $query->where('type_of_document', $type);
        }

        // Filter by encoder (for \"My Documents\" views in the frontend)
        if ($encodedBy = $request->get('encoded_by')) {
            $query->where('encoded_by_id', $encodedBy);
        }

        // Encoders can only see their own documents
        $currentUser = $request->user();
        if ($currentUser && $currentUser->role === 'Encoder') {
            $query->where('encoded_by_id', $currentUser->id);
        }

        if ($from = $request->get('date_from')) {
            $query->whereDate('date', '>=', $from);
        }

        if ($to = $request->get('date_to')) {
            $query->whereDate('date', '<=', $to);
        }

        $perPage = (int) $request->get('per_page', 20);

        $paginator = $query->paginate($perPage);

        return response()->json([
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        // Encoders and Admins can create documents
        $this->authorizeRole($request, ['Admin', 'Encoder']);

        $validated = $this->validateDocument($request);

        $user = $request->user();

        // Set encoded_by to current user
        $validated['encoded_by_id'] = $user->id;

        // Generate backend-only document code
        $department = Department::findOrFail($validated['department_id']);
        $validated['document_code'] = $this->generateDocumentCode($department);

        // Auto-generate document_number if not provided, using the same value as document_code.
        // This ensures uniqueness and provides a manual reference when needed.
        if (empty($validated['document_number'])) {
            $validated['document_number'] = $validated['document_code'];
        }

        $document = Document::create($validated);

        AuditTrail::create([
            'user_id' => $user->id,
            'document_id' => $document->id,
            'action' => 'document_created',
            'payload' => $document->toArray(),
        ]);

        return response()->json($document, 201);
    }

    public function show(Request $request, Document $document)
    {
        $user = $request->user();

        // Encoders may only view their own documents
        if ($user && $user->role === 'Encoder' && $document->encoded_by_id !== $user->id) {
            abort(403, 'You are not authorized to view this document.');
        }

        $document->load(['department', 'encodedBy']);

        return response()->json($document);
    }

    public function update(Request $request, Document $document)
    {
        $this->authorizeRole($request, ['Admin', 'Encoder']);

        $validated = $this->validateDocument($request, $document->id);

        // Document code is NON-editable; never overwrite it from client-provided data
        unset($validated['document_code'], $validated['encoded_by_id']);

        $before = $document->toArray();
        $document->update($validated);

        AuditTrail::create([
            'user_id' => $request->user()->id,
            'document_id' => $document->id,
            'action' => 'document_updated',
            'payload' => [
                'before' => $before,
                'after' => $document->toArray(),
            ],
        ]);

        return response()->json($document);
    }

    public function destroy(Request $request, Document $document)
    {
        $this->authorizeRole($request, ['Admin']);

        $snapshot = $document->toArray();
        $document->delete();

        AuditTrail::create([
            'user_id' => $request->user()->id,
            'document_id' => $snapshot['id'] ?? null,
            'action' => 'document_deleted',
            'payload' => $snapshot,
        ]);

        return response()->json([
            'message' => 'Document deleted.',
        ]);
    }

    /**
     * Dashboard metrics: totals, by status, by department, optional date range.
     *
     * Sample JSON response:
     * {
     *   "total_documents": 120,
     *   "by_status": { "Pending": 40, "Approved": 60, "Released": 20 },
     *   "by_department": [
     *     { "department_id": 1, "department_name": "Budget", "total": 35 }
     *   ]
     * }
     */
    public function metrics(Request $request)
    {
        $query = Document::query();

        if ($from = $request->get('date_from')) {
            $query->whereDate('date', '>=', $from);
        }

        if ($to = $request->get('date_to')) {
            $query->whereDate('date', '<=', $to);
        }

        $totalDocuments = $query->count();

        $byStatus = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $byDepartment = (clone $query)
            ->select('department_id', DB::raw('COUNT(*) as total'))
            ->groupBy('department_id')
            ->with('department')
            ->get()
            ->map(function ($row) {
                return [
                    'department_id' => $row->department_id,
                    'department_name' => optional($row->department)->name,
                    'total' => $row->total,
                ];
            });

        return response()->json([
            'total_documents' => $totalDocuments,
            'by_status' => $byStatus,
            'by_department' => $byDepartment,
        ]);
    }

    /**
     * Recent transactions for dashboard table.
     */
    public function recent(Request $request)
    {
        $limit = (int) $request->get('limit', 10);

        $documents = Document::with(['department', 'encodedBy'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json($documents);
    }

    /**
     * Simple CSV-based export for Excel consumers.
     * In production you would likely use a package like
     * maatwebsite/excel, but this demonstrates the endpoint.
     */
    public function exportExcel(Request $request)
    {
        $documents = $this->buildExportQuery($request)->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="documents-export.csv"',
        ];

        $callback = function () use ($documents) {
            $handle = fopen('php://output', 'w');

            // Header row
            fputcsv($handle, [
                'Date',
                'Encoded By',
                'Type',
                'Document Code',
                'Document Number',
                'Pay Claimant',
                'Particular',
                'Amount',
                'Department',
                'Status',
                'Remarks',
                'Date Out',
            ]);

            foreach ($documents as $doc) {
                fputcsv($handle, [
                    $doc->date?->format('Y-m-d'),
                    optional($doc->encodedBy)->name,
                    $doc->type_of_document,
                    $doc->document_code,
                    $doc->document_number,
                    $doc->pay_claimant,
                    $doc->particular,
                    $doc->amount,
                    optional($doc->department)->name,
                    $doc->status,
                    $doc->remarks,
                    $doc->date_out?->format('Y-m-d'),
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Minimal PDF-ish export returning plain text with application/pdf header.
     * In production, plug in a real PDF generator like dompdf.
     */
    public function exportPdf(Request $request)
    {
        $documents = $this->buildExportQuery($request)->get();

        $content = "City Hall Documents Export\n\n";
        foreach ($documents as $doc) {
            $content .= sprintf(
                "[%s] %s | %s | %s | %0.2f\n",
                $doc->document_code,
                $doc->date?->format('Y-m-d'),
                $doc->pay_claimant,
                $doc->status,
                $doc->amount
            );
        }

        return response($content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename=\"documents-export.pdf\"',
        ]);
    }

    /**
     * Shared export filters (reusing same query rules as index).
     */
    protected function buildExportQuery(Request $request)
    {
        $query = Document::with(['department', 'encodedBy'])->orderBy('date');

        if ($code = $request->get('code')) {
            $query->where('document_code', 'like', '%' . $code . '%');
        }

        if ($departmentId = $request->get('department_id')) {
            $query->where('department_id', $departmentId);
        }

        if ($departmentCode = $request->get('department_code')) {
            $query->whereHas('department', function ($q) use ($departmentCode) {
                $q->where('code', $departmentCode);
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->get('type')) {
            $query->where('type_of_document', $type);
        }

        if ($from = $request->get('date_from')) {
            $query->whereDate('date', '>=', $from);
        }

        if ($to = $request->get('date_to')) {
            $query->whereDate('date', '<=', $to);
        }

        return $query;
    }

    /**
     * Validate document payload from request.
     */
    protected function validateDocument(Request $request, ?int $documentId = null): array
    {
        return $request->validate([
            'date' => ['required', 'date'],
            'type_of_document' => ['required', 'string', 'max:255'],
            'document_number' => [
                'nullable',
                'string',
                'max:255',
                // Prevent duplicate document numbers (except for the current record on update)
                'unique:documents,document_number' . ($documentId ? ',' . $documentId : ''),
            ],
            'pay_claimant' => ['required', 'string', 'max:255'],
            'particular' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
            'department_id' => ['required', 'exists:departments,id'],
            'status' => ['required', 'string', 'max:50'],
            'remarks' => ['nullable', 'string'],
            'date_out' => ['nullable', 'date'],
        ]);
    }

    /**
     * Generate automatic document code on the backend only.
     *
     * Format: CH-YYYY-DEPT-XXXX
     * - CH is fixed prefix for City Hall
     * - YYYY is the document year
     * - DEPT is the requesting department code (e.g. BUD)
     * - XXXX is a zero-padded running sequence per year+department
     */
    protected function generateDocumentCode(Department $department): string
    {
        $year = now()->year;

        // Count existing documents for this year + department to get next sequence.
        $sequence = Document::whereYear('date', $year)
            ->where('department_id', $department->id)
            ->count() + 1;

        $sequencePadded = str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);

        return sprintf('CH-%d-%s-%s', $year, $department->code, $sequencePadded);
    }

    protected function authorizeRole(Request $request, array $roles): void
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'You are not authorized to perform this action.');
        }
    }
}

