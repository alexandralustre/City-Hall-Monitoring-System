"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import { cachedJson } from "@/lib/cache";

type Department = {
  id: number;
  name: string;
  code: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  async function loadDepartments() {
    const res = await fetch(`${API_BASE}/departments?per_page=100`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
    setDepartments(res.data ?? []);
  }

  useEffect(() => {
    async function init() {
      try {
        await cachedJson(
          "departments:per_page=100",
          async () => {
            await loadDepartments();
            return true;
          },
          5 * 60 * 1000
        );
      } catch (err: any) {
        setError(err.message || "Failed to load departments");
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code: code.toUpperCase() }),
      });
      
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to create department");
      }
      
      setName("");
      setCode("");
      setSuccess("Department created successfully!");
      await loadDepartments();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to create department");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-4xl">⏳</div>
              <p className="text-lg text-gray-600">Loading departments...</p>
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
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="mt-2 text-lg text-gray-600">
          Manage departments and their codes used in document tracking
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">✅</span>
            <p className="font-semibold text-green-800">{success}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Department Form */}
      <div className="mb-8 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Add New Department
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Department Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., Budget Office"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the full name of the department
              </p>
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Department Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base font-mono focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="e.g., BUDG"
                maxLength={10}
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Short code used in document codes (e.g., BUDG, TREAS, ACCT)
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>➕</span>
                  <span>Add Department</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Departments List */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Departments ({departments.length})
          </h2>
        </div>
        {departments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Department Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Code
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-base text-gray-900">{d.name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 font-mono text-base font-semibold text-blue-800">
                        {d.code}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <div className="mb-4 text-5xl">🏢</div>
            <p className="mb-2 text-lg font-medium text-gray-900">
              No departments yet
            </p>
            <p className="text-base text-gray-600">
              Add your first department using the form above
            </p>
          </div>
        )}
      </div>
      </MainLayout>
    </RoleGuard>
  );
}
