"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";

type User = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Encoder" | "Viewer";
  is_active?: boolean;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch(`${API_BASE}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        setUsers(res.data ?? []);
      } catch (err: any) {
        setError(err.message || "Failed to load users");
        clearAuthToken();
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token]);

  async function toggleActive(user: User) {
    try {
      setSavingId(user.id);
      setError(null);
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          role: user.role,
          is_active: !user.is_active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update user");
      }
      const updated = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u))
      );
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setSavingId(null);
    }
  }

  async function resetPassword(user: User) {
    if (
      !confirm(
        `Reset password for ${user.name}? The password will be set to a default value.`
      )
    ) {
      return;
    }
    try {
      setSavingId(user.id);
      setError(null);
      const res = await fetch(`${API_BASE}/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to reset password");
      }
      // We don't expose the default password in UI for security; admin can communicate it separately.
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-4xl">⏳</div>
              <p className="text-lg text-gray-600">Loading users...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <MainLayout>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage system users and their access levels
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="font-semibold text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              All Users ({users.length})
            </h2>
          </div>
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-900">{user.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            user.is_active ?? true
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {user.is_active ?? true ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-3">
                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() => toggleActive(user)}
                          className="text-base font-medium text-blue-600 hover:text-blue-800 disabled:opacity-60"
                        >
                          {user.is_active ?? true ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={savingId === user.id}
                          onClick={() => resetPassword(user)}
                          className="text-base font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">👥</div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No users found
              </p>
            </div>
          )}
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
