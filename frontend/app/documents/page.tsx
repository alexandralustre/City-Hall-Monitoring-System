"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";

type Department = {
  id: number;
  name: string;
  code: string;
};

type Document = {
  id: number;
  document_code: string;
  date: string;
  type_of_document: string;
  pay_claimant: string;
  amount: string;
  status: string;
  department?: Department;
};

type PaginatedResponse<T> = {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function DocumentsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginatedResponse<Document>["meta"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  // Debounce typing in the search box (prevents API call on every keystroke)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const documentsUrl = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("per_page", "20");
    qs.set("page", String(page));
    if (search) qs.set("code", search);
    if (statusFilter) qs.set("status", statusFilter);
    if (departmentFilter) qs.set("department_id", departmentFilter);
    return `${API_BASE}/documents?${qs.toString()}`;
  }, [page, search, statusFilter, departmentFilter]);

  useEffect(() => {
    // Don’t fetch until auth state is ready
    if (auth.loading) return;
    if (!auth.user) {
      router.replace("/login");
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        setError(null);
        if (!loading) setFetching(true);

        const headers = { Authorization: `Bearer ${token}` };

        const depsRes = await cachedJson(
          "departments:per_page=100",
          async () => {
            const r = await fetch(`${API_BASE}/departments?per_page=100`, {
              headers,
              signal: controller.signal,
            });
            if (!r.ok) throw new Error("Failed to load departments");
            return r.json();
          },
          10 * 60 * 1000
        );

        const docsRes = await (async () => {
          const r = await fetch(documentsUrl, {
            headers,
            signal: controller.signal,
          });
          if (!r.ok) {
            const body = await r.json().catch(() => ({}));
            throw new Error(body.message || "Failed to load documents");
          }
          return r.json();
        })();

        setDepartments(depsRes.data ?? []);
        setDocuments(docsRes.data ?? []);
        setMeta(docsRes.meta);
      } catch (err: any) {
        // If request was cancelled due to navigation, ignore
        if (err?.name === "AbortError") return;
        setError(err.message || "Failed to load documents");
        // If token is invalid/expired, send user back to login
        if ((err.message || "").toLowerCase().includes("unauth")) {
          clearAuthToken();
          router.replace("/login");
        }
      } finally {
        setFetching(false);
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.user, documentsUrl]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 text-4xl">⏳</div>
            <p className="text-lg text-gray-600">Loading documents...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-lg text-gray-600">
            Manage and track all your documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetching && (
            <span className="text-sm text-gray-600">Updating list…</span>
          )}
          <Link
            href="/documents/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
          <span>➕</span>
          <span>New Document</span>
          </Link>
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Search & Filter
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Search by Document Code
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              placeholder="e.g., CH-2026-BUDG-0001"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Released">Released</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Filter by Department
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setPage(1);
                setDepartmentFilter(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <a
              href={`${API_BASE}/documents/export/excel`}
              className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-center text-base font-semibold text-white shadow-md hover:bg-green-700 transition-colors"
            >
              📊 Export Excel
            </a>
            <a
              href={`${API_BASE}/documents/export/pdf`}
              className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-center text-base font-semibold text-white shadow-md hover:bg-red-700 transition-colors"
            >
              📄 Export PDF
            </a>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Document List
            {meta && (
              <span className="ml-2 text-base font-normal text-gray-600">
                ({meta.total} total)
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {documents.length > 0 ? (
            <>
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
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Pay Claimant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Department
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Amount
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
                  {documents.map((doc) => (
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
                          {doc.type_of_document}
                        </span>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-base font-semibold text-gray-900">
                          ₱{parseFloat(doc.amount).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800">
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap space-x-3">
                        <Link
                          href={`/documents/${doc.id}/edit`}
                          className="text-base font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {meta && (
                <div className="border-t border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-base text-gray-600">
                      Showing page {meta.current_page} of{" "}
                      {Math.max(1, Math.ceil(meta.total / meta.per_page))} (
                      {meta.total} total documents)
                    </p>
                    <div className="flex gap-3">
                      <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        ← Previous
                      </button>
                      <button
                        disabled={
                          meta.current_page * meta.per_page >= meta.total
                        }
                        onClick={() => setPage((p) => p + 1)}
                        className="rounded-lg border border-gray-300 bg-white px-5 py-2 text-base font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-6 py-12 text-center">
              <div className="mb-4 text-5xl">📄</div>
              <p className="mb-2 text-lg font-medium text-gray-900">
                No documents found
              </p>
              <p className="mb-6 text-base text-gray-600">
                {search || statusFilter || departmentFilter
                  ? "Try adjusting your filters"
                  : "Get started by creating your first document"}
              </p>
              <Link
                href="/documents/new"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
              >
                <span>➕</span>
                <span>Create New Document</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
