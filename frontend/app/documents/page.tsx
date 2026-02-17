"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import { useAuth } from "@/components/AuthProvider";
import { cachedJson } from "@/lib/cache";
import StatusBadge from "@/components/StatusBadge";
import StatusCell from "@/components/StatusCell";
import Loader from "@/components/Loader";
import { formatDisplayDate, formatTimeEncoded } from "@/lib/dateUtils";

type Department = {
  id: number;
  name: string;
  code: string;
};

type Document = {
  id: number;
  document_code: string;
  document_number?: string | null;
  date: string;
  date_out?: string | null;
  type_of_document: string;
  pay_claimant: string;
  particular: string;
  amount: string;
  status: string;
  remarks?: string | null;
  department?: Department;
  encoded_by_id?: number;
  encoded_by?: {
    name?: string;
  } | null;
  created_at?: string;
  updated_at?: string;
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
  const [requestingId, setRequestingId] = useState<number | null>(null);
  const [acceptedDocIds, setAcceptedDocIds] = useState<number[]>([]);

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

  // Load outgoing accepted edit requests for the current user so that
  // documents with temporary edit permission show the Edit action.
  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user || !token) return;

    const controller = new AbortController();
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const res = await fetch(`${API_BASE}/edit-requests/outgoing`, {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.data ?? []) as {
          document_id: number;
          status: string;
          expires_at?: string | null;
        }[];
        const now = new Date();
        const ids = list
          .filter((r) => {
            if (r.status !== "accepted") return false;
            if (!r.expires_at) return true;
            const exp = new Date(r.expires_at);
            return !Number.isNaN(exp.getTime()) && exp > now;
          })
          .map((r) => r.document_id);
        setAcceptedDocIds(ids);
      } catch {
        // Silently ignore; documents can still be loaded without this.
      }
    })();

    return () => controller.abort();
  }, [auth.loading, auth.user, token]);

  async function handleRequestEdit(doc: Document) {
    if (!auth.user) return;
    if (!confirm(`Send an edit request for document ${doc.document_code}?`)) {
      return;
    }
    try {
      setRequestingId(doc.id);
      const res = await fetch(
        `${API_BASE}/documents/${doc.id}/edit-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            remarks: `Edit request from ${auth.user.name} via All Documents list`,
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to send edit request");
      }
      alert("Edit request sent to the document owner.");
    } catch (err: any) {
      alert(err.message || "Failed to send edit request.");
    } finally {
      setRequestingId(null);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader size="lg" />
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
            Manage and track all documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {fetching && (
            <span className="text-sm text-gray-600">Updating list…</span>
          )}
          <Link
            href="/documents/new"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700"
          >
            <span className="text-lg" aria-hidden="true">
              ＋
            </span>
            <span>New Document</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Search &amp; Filter
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Search by document code and quickly narrow down by status or
              department.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <a
              href={`${API_BASE}/documents/export/excel`}
              className="inline-flex items-center justify-center rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-green-700"
            >
              <span className="mr-1" aria-hidden="true">
                📊
              </span>
              Export Excel
            </a>
            <a
              href={`${API_BASE}/documents/export/pdf`}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-red-700"
            >
              <span className="mr-1" aria-hidden="true">
                📄
              </span>
              Export PDF
            </a>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <div className="md:col-span-2">
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
              className="w-full rounded-full border border-gray-300 px-4 py-3 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
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
              className="w-full rounded-full border border-gray-300 px-4 py-3 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">All status</option>
              <option value="For Signature">For Signature</option>
              <option value="For Review">For Review</option>
              <option value="For Initial">For Initial</option>
              <option value="For Schedule">For Schedule</option>
              <option value="Signed">Signed</option>
              <option value="Filed">Filed</option>
              <option value="Returned">Returned</option>
              <option value="Hold">Hold</option>
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
              className="w-full rounded-full border border-gray-300 px-4 py-3 text-sm shadow-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-2xl border border-gray-200 bg-white/95 shadow-md">
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
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Payee / Claimant
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Document No.
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Particular
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Encoded By
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date Received
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date Released
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Remarks
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Dept. Out
                    </th>
                    <th className="w-[200px] px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Status
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
                          {doc.document_number || doc.document_code}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="line-clamp-2 text-sm text-gray-700">
                          {doc.particular}
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
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900">
                            {doc.encoded_by?.name ??
                              (doc.encoded_by_id
                                ? `User #${doc.encoded_by_id}`
                                : "—")}
                          </span>
                          <span className="mt-0.5 text-xs text-gray-500 font-normal">
                            {formatTimeEncoded(doc.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {formatDisplayDate(doc.date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {formatDisplayDate(doc.date_out ?? null)}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="line-clamp-2 text-sm text-gray-700">
                          {doc.remarks || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {formatDisplayDate(doc.date_out ?? null)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusCell
                          status={doc.status}
                          action={
                            auth.user &&
                            (doc.encoded_by_id === auth.user.id ||
                              acceptedDocIds.includes(doc.id)) ? (
                              <Link
                                href={`/documents/${doc.id}/edit`}
                                className="text-sm font-medium text-[#7b2c3d] hover:text-[#6b2433] hover:underline"
                              >
                                Edit
                              </Link>
                            ) : (
                              <button
                                type="button"
                                disabled={requestingId === doc.id}
                                onClick={() => handleRequestEdit(doc)}
                                className="text-sm font-medium text-[#7b2c3d] hover:text-[#6b2433] hover:underline disabled:opacity-60"
                              >
                                Request Edit
                              </button>
                            )
                          }
                        />
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
                className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-red-700"
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
