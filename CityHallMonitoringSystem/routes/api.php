<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\EditRequestController;
use App\Http\Controllers\UserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are prefixed with /api by the HTTP kernel. They return JSON
| responses only and are consumed by the Next.js frontend.
|
*/

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    // Authenticated user info & logout
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Department CRUD
    Route::get('/departments', [DepartmentController::class, 'index']);
    Route::post('/departments', [DepartmentController::class, 'store']);
    Route::get('/departments/{department}', [DepartmentController::class, 'show']);
    Route::put('/departments/{department}', [DepartmentController::class, 'update']);
    Route::delete('/departments/{department}', [DepartmentController::class, 'destroy']);

    // User management (admin only, enforced in controller)
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::post('/users/{user}/approve', [UserController::class, 'approve']);
    Route::post('/users/{user}/reject', [UserController::class, 'reject']);

    // Edit request workflow (user-to-user)
    Route::post('/documents/{document}/edit-requests', [EditRequestController::class, 'store']);
    Route::get('/edit-requests/incoming', [EditRequestController::class, 'incoming']);
    Route::get('/edit-requests/outgoing', [EditRequestController::class, 'outgoing']);
    Route::post('/edit-requests/{editRequest}/accept', [EditRequestController::class, 'accept']);
    Route::post('/edit-requests/{editRequest}/reject', [EditRequestController::class, 'reject']);

    // Document CRUD & filtering
    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/recent', [DocumentController::class, 'recent']);
    Route::get('/documents/export/excel', [DocumentController::class, 'exportExcel']);
    Route::get('/documents/export/pdf', [DocumentController::class, 'exportPdf']);
    // Document history (admin-only) – must be before generic {document} route
    Route::get('/documents/{document}/history', [DocumentController::class, 'history']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    // Dashboard & utilities
    Route::get('/dashboard/metrics', [DocumentController::class, 'metrics']);
});
