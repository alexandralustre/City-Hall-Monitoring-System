<?php

namespace App\Http\Controllers;

use App\Models\AuditTrail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate the user and issue a Sanctum token.
     *
     * Sample request:
     * {
     *   "email": "admin@example.com",
     *   "password": "secret"
     * }
     */
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'email' => ['required', 'email'],
                'password' => ['required'],
            ]);

            if (! Auth::attempt($credentials)) {
                return response()->json([
                    'message' => 'The provided credentials are incorrect.',
                    'errors' => [
                        'email' => ['The provided credentials are incorrect.'],
                    ],
                ], 401);
            }

            /** @var User $user */
            $user = Auth::user();

            // Prevent inactive users from logging in
            if (property_exists($user, 'is_active') && ! $user->is_active) {
                Auth::logout();
                return response()->json([
                    'message' => 'Your account is deactivated. Please contact the system administrator.',
                ], 403);
            }

            // Create a personal access token for API calls
            $token = $user->createToken('city-hall-monitoring')->plainTextToken;

            // Log audit trail if possible (don't fail if table doesn't exist)
            try {
                AuditTrail::create([
                    'user_id' => $user->id,
                    'action' => 'login',
                    'payload' => ['ip' => $request->ip(), 'user_agent' => $request->userAgent()],
                ]);
            } catch (\Exception $e) {
                // Audit trail creation failed, but continue with login
                \Log::warning('Audit trail creation failed: ' . $e->getMessage());
            }

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Login error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred during login. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    /**
     * Return the currently authenticated user.
     */
    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
        ]);
    }

    /**
     * Revoke the current token.
     */
    public function logout(Request $request)
    {
        try {
            $user = $request->user();

            $user?->currentAccessToken()?->delete();

            // Log audit trail if possible
            try {
                AuditTrail::create([
                    'user_id' => $user->id,
                    'action' => 'logout',
                    'payload' => ['ip' => $request->ip(), 'user_agent' => $request->userAgent()],
                ]);
            } catch (\Exception $e) {
                \Log::warning('Audit trail creation failed: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Logged out successfully.',
            ]);
        } catch (\Exception $e) {
            \Log::error('Logout error: ' . $e->getMessage());
            return response()->json([
                'message' => 'An error occurred during logout.',
            ], 500);
        }
    }
}

