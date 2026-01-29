<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * List users for admin management.
     *
     * Response shape:
     * {
     *   "data": [{ "id": 1, "name": "System Admin", "email": "...", "role": "Admin" }],
     *   "meta": { "current_page": 1, "per_page": 20, "total": 3 }
     * }
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, ['Admin']);

        $query = User::query()->orderBy('name');

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

    /**
     * Create a new user (typically Encoder or Viewer).
     */
    public function store(Request $request)
    {
        $this->authorizeRole($request, ['Admin']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'role' => ['required', 'in:Admin,Encoder,Viewer'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Default password for new users - should be changed on first login
        $password = $request->input('password', 'Password@123');

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'is_active' => $validated['is_active'] ?? true,
            'password' => bcrypt($password),
        ]);

        try {
            AuditTrail::create([
                'user_id' => $request->user()->id,
                'action' => 'user_created',
                'payload' => $user->toArray(),
            ]);
        } catch (\Exception $e) {
            \Log::warning('Audit trail (user_created) failed: ' . $e->getMessage());
        }

        return response()->json($user, 201);
    }

    /**
     * Update a user's basic information and role.
     */
    public function update(Request $request, User $user)
    {
        $this->authorizeRole($request, ['Admin']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'role' => ['required', 'in:Admin,Encoder,Viewer'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $before = $user->toArray();
        $user->update($validated);

        // Record audit trail, but don't break if logging fails
        try {
            AuditTrail::create([
                'user_id' => $request->user()->id,
                'action' => 'user_updated',
                'payload' => [
                    'before' => $before,
                    'after' => $user->toArray(),
                ],
            ]);
        } catch (\Exception $e) {
            \Log::warning('Audit trail (user_updated) failed: ' . $e->getMessage());
        }

        return response()->json($user);
    }

    /**
     * Reset a user's password to a default value.
     */
    public function resetPassword(Request $request, User $user)
    {
        $this->authorizeRole($request, ['Admin']);

        $defaultPassword = 'Password@123';

        $user->update([
            'password' => bcrypt($defaultPassword),
        ]);

        try {
            AuditTrail::create([
                'user_id' => $request->user()->id,
                'action' => 'user_password_reset',
                'payload' => [
                    'reset_user_id' => $user->id,
                ],
            ]);
        } catch (\Exception $e) {
            \Log::warning('Audit trail (user_password_reset) failed: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Password has been reset.',
            'default_password' => $defaultPassword,
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

