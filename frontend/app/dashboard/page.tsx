"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthToken, type User } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";
import StatusBadge from "@/components/StatusBadge";
import StatusCell from "@/components/StatusCell";
import Loader from "@/components/Loader";

type Metrics = {
  total_documents: number;
  by_status: Record<string, number>;
  by_department: {
    department_id: number;
    department_name: string | null;
    total: number;
  }[];
};

type DocumentRow = {
  id: number;
  document_code: string;
  date: string;
  pay_claimant: string;
  status: string;
  department?: { name: string };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<DocumentRow[]>([]);
  const [myDocuments, setMyDocuments] = useState<DocumentRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        if (auth.loading) return;
        if (!auth.user) {
          router.replace("/login");
          return;
        }

        const userData = auth.user;
        setUser(userData);

        if (userData.role === "Admin") {
          // Admin: Full system overview
          const headers = { Authorization: `Bearer ${token}` };
          const [metricsRes, recentRes] = await Promise.all([
            cachedJson(
              "dashboard:metrics",
              async () => {
                const r = await fetch(`${API_BASE}/dashboard/metrics`, { headers });
                if (!r.ok) throw new Error("Failed to load metrics");
                return r.json();
              },
              30 * 1000
            ),
            cachedJson(
              "dashboard:recent:10",
              async () => {
                const r = await fetch(`${API_BASE}/documents/recent?limit=10`, {
                  headers,
                });
                if (!r.ok) throw new Error("Failed to load recent documents");
                return r.json();
              },
              10 * 1000
            ),
          ]);
          setMetrics(metricsRes);
          setRecent(recentRes);
        } else if (userData.role === "Encoder") {
          // Encoder: Personal focus
          const headers = { Authorization: `Bearer ${token}` };
          const [myDocsRes, recentRes] = await Promise.all([
            fetch(`${API_BASE}/documents?encoded_by=${userData.id}&per_page=5`, {
              headers,
            }).then((r) => r.json()),
            cachedJson(
              "dashboard:recent:5",
              async () => {
                const r = await fetch(`${API_BASE}/documents/recent?limit=5`, {
                  headers,
                });
                if (!r.ok) throw new Error("Failed to load recent documents");
                return r.json();
              },
              10 * 1000
            ),
          ]);
          setMyDocuments(myDocsRes.data ?? []);
          setRecent(recentRes);
        } else {
          // Viewer: Read-only overview
          const metricsRes = await cachedJson(
            "dashboard:metrics",
            async () => {
              const r = await fetch(`${API_BASE}/dashboard/metrics`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!r.ok) throw new Error("Failed to load metrics");
              return r.json();
            },
            30 * 1000
          );
          setMetrics(metricsRes);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard");
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token, auth.loading, auth.user]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
            <p className="text-lg text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">{error}</p>
        </div>
      </MainLayout>
    );
  }

  // Admin Dashboard
  if (user?.role === "Admin") {
    return (
      <MainLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Complete system overview and management
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-medium text-gray-600 mb-1">
                  Total Documents
                </p>
                <p className="text-4xl font-bold text-gray-900">
                  {metrics?.total_documents ?? 0}
                </p>
              </div>
              <div className="text-4xl">📄</div>
            </div>
            <Link
              href="/documents"
              className="mt-4 inline-block text-base font-medium text-blue-600 hover:text-blue-700"
            >
              View all documents →
            </Link>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-base font-medium text-gray-600 mb-4">
              Documents by Status
            </p>
            <div className="space-y-3">
              {metrics && Object.keys(metrics.by_status).length > 0 ? (
                Object.entries(metrics.by_status).map(([status, total]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-base text-gray-700">{status}</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {total}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-base text-gray-500">No data</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <p className="text-base font-medium text-gray-600 mb-4">
              Documents by Department
            </p>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {metrics && metrics.by_department.length > 0 ? (
                metrics.by_department.map((row) => (
                  <div
                    key={row.department_id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <span className="text-base text-gray-700">
                      {row.department_name ?? "Unknown"}
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {row.total}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-base text-gray-500">No data</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent System Activity
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Document Code
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Pay Claimant
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Department
                  </th>
                  <th className="w-[180px] px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {recent.length > 0 ? (
                  recent.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-mono font-medium text-gray-900">
                          {doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">{doc.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">
                          {doc.pay_claimant}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">
                          {doc.department?.name ?? "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell status={doc.status} />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-base text-gray-500">No recent activity</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Encoder Dashboard
  if (user?.role === "Encoder") {
    return (
      <MainLayout>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="mt-2 text-lg text-gray-600">
            Quick overview of your work today
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-6 md:grid-cols-3">
          <Link
            href="/documents/new"
            className="rounded-xl bg-blue-600 p-6 shadow-md hover:bg-blue-700 transition-colors text-white"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Encode Document</h3>
              <span className="text-3xl">➕</span>
            </div>
            <p className="text-blue-100">
              Create a new document entry
            </p>
          </Link>

          <Link
            href="/documents/my"
            className="rounded-xl bg-white p-6 shadow-sm border-2 border-gray-200 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                My Documents
              </h3>
              <span className="text-3xl">📝</span>
            </div>
            <p className="text-gray-600">
              View documents you encoded ({myDocuments.length})
            </p>
          </Link>

          <Link
            href="/documents/pending"
            className="rounded-xl bg-white p-6 shadow-sm border-2 border-gray-200 hover:border-blue-500 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold text-gray-900">
                Pending
              </h3>
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-gray-600">
              Documents waiting for action
            </p>
          </Link>
        </div>

        {/* Recent Documents I Encoded */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              My Recent Documents
            </h2>
            <Link
              href="/documents/my"
              className="text-base font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </Link>
          </div>
          {myDocuments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Document Code
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Pay Claimant
                    </th>
                    <th className="w-[200px] px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {myDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-mono font-medium text-gray-900">
                          {doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base text-gray-700">{doc.date}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base text-gray-700">
                          {doc.pay_claimant}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell
                          status={doc.status}
                          action={
                            <Link
                              href={`/documents/${doc.id}/edit`}
                              className="text-sm font-medium text-[#7b2c3d] hover:text-[#6b2433] hover:underline"
                            >
                              Edit
                            </Link>
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">📝</div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No documents yet
              </p>
              <p className="mb-6 text-base text-gray-600">
                Start by encoding your first document
              </p>
              <Link
                href="/documents/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <span>➕</span>
                <span>Encode New Document</span>
              </Link>
            </div>
          )}
        </div>
      </MainLayout>
    );
  }

  // Viewer Dashboard (fallback)
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">System overview</p>
      </div>
      {/* Viewer content similar to admin but read-only */}
    </MainLayout>
  );
}
