<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * List departments (for dropdowns and management).
     *
     * Sample response:
     * {
     *   "data": [{ "id": 1, "name": "Budget Office", "code": "BUD" }],
     *   "meta": { "total": 1 }
     * }
     */
    public function index(Request $request)
    {
        $query = Department::query()->orderBy('name');

        $perPage = (int) $request->get('per_page', 50);

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
        $this->authorizeRole($request, ['Admin']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', 'unique:departments,code'],
        ]);

        $department = Department::create($validated);

        AuditTrail::create([
            'user_id' => $request->user()->id,
            'action' => 'department_created',
            'payload' => $department->toArray(),
        ]);

        return response()->json($department, 201);
    }

    public function show(Department $department)
    {
        return response()->json($department);
    }

    public function update(Request $request, Department $department)
    {
        $this->authorizeRole($request, ['Admin']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['required', 'string', 'max:10', 'unique:departments,code,' . $department->id],
        ]);

        $before = $department->toArray();
        $department->update($validated);

        AuditTrail::create([
            'user_id' => $request->user()->id,
            'action' => 'department_updated',
            'payload' => [
                'before' => $before,
                'after' => $department->toArray(),
            ],
        ]);

        return response()->json($department);
    }

    public function destroy(Request $request, Department $department)
    {
        $this->authorizeRole($request, ['Admin']);

        $snapshot = $department->toArray();
        $department->delete();

        AuditTrail::create([
            'user_id' => $request->user()->id,
            'action' => 'department_deleted',
            'payload' => $snapshot,
        ]);

        return response()->json([
            'message' => 'Department deleted.',
        ]);
    }

    /**
     * Simple role check helper for controllers.
     */
    protected function authorizeRole(Request $request, array $roles): void
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            abort(403, 'You are not authorized to perform this action.');
        }
    }
}

