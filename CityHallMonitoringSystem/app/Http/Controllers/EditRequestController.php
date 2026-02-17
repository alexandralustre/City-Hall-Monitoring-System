<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\Document;
use App\Models\EditRequest;
use Illuminate\Http\Request;

class EditRequestController extends Controller
{
    /**
     * Create a new edit request for a document owned by another user.
     */
    public function store(Request $request, Document $document)
    {
        $user = $request->user();

        if (! $user) {
            abort(401);
        }

        // Cannot request edit on own document
        if ((int) $document->encoded_by_id === (int) $user->id) {
            abort(422, 'You already own this document.');
        }

        $owner = $document->encodedBy;
        if (! $owner) {
            abort(422, 'Document has no recorded encoder.');
        }

        $data = $request->validate([
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $editRequest = EditRequest::create([
            'document_id' => $document->id,
            'requested_by_user_id' => $user->id,
            'requested_to_user_id' => $owner->id,
            'status' => 'pending',
            'remarks' => $data['remarks'] ?? null,
        ]);

        AuditTrail::create([
            'user_id' => $user->id,
            'document_id' => $document->id,
            'action' => 'edit_request_created',
            'payload' => [
                'request_id' => $editRequest->id,
                'requested_by_user_id' => $user->id,
                'requested_by_name' => $user->name,
                'requested_to_user_id' => $owner->id,
                'requested_to_name' => $owner->name,
                'document_code' => $document->document_code,
                'remarks' => $editRequest->remarks,
                'requested_at' => now()->toIso8601String(),
            ],
        ]);

        return response()->json($editRequest, 201);
    }

    /**
     * List incoming edit requests for the current user (document owner).
     */
    public function incoming(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $requests = EditRequest::with(['document', 'requestedBy'])
            ->where('requested_to_user_id', $user->id)
            ->whereIn('status', ['pending', 'accepted'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    /**
     * List outgoing edit requests created by the current user.
     * Used for notifying the requester when a request is approved/rejected.
     */
    public function outgoing(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $requests = EditRequest::with(['document', 'requestedTo'])
            ->where('requested_by_user_id', $user->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $requests]);
    }

    public function accept(Request $request, EditRequest $editRequest)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        if ($user->id !== $editRequest->requested_to_user_id) {
            abort(403, 'Only the document owner can approve this request.');
        }

        if ($editRequest->status !== 'pending') {
            abort(422, 'This request is no longer pending.');
        }

        $editRequest->update([
            'status' => 'accepted',
            'accepted_at' => now(),
            'expires_at' => now()->addHours(2),
        ]);

        AuditTrail::create([
            'user_id' => $user->id,
            'document_id' => $editRequest->document_id,
            'action' => 'edit_request_approved',
            'payload' => [
                'request_id' => $editRequest->id,
                'requested_by_user_id' => $editRequest->requested_by_user_id,
                'requested_to_user_id' => $editRequest->requested_to_user_id,
                'accepted_at' => $editRequest->accepted_at?->toIso8601String(),
                'expires_at' => $editRequest->expires_at?->toIso8601String(),
            ],
        ]);

        return response()->json($editRequest);
    }

    public function reject(Request $request, EditRequest $editRequest)
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        if ($user->id !== $editRequest->requested_to_user_id) {
            abort(403, 'Only the document owner can reject this request.');
        }

        if ($editRequest->status !== 'pending') {
            abort(422, 'This request is no longer pending.');
        }

        $editRequest->update([
            'status' => 'rejected',
        ]);

        AuditTrail::create([
            'user_id' => $user->id,
            'document_id' => $editRequest->document_id,
            'action' => 'edit_request_rejected',
            'payload' => [
                'request_id' => $editRequest->id,
                'requested_by_user_id' => $editRequest->requested_by_user_id,
                'requested_to_user_id' => $editRequest->requested_to_user_id,
                'rejected_at' => now()->toIso8601String(),
            ],
        ]);

        return response()->json($editRequest);
    }
}

