"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import { useAuth } from "@/components/AuthProvider";
import StatusCell from "@/components/StatusCell";
import Loader from "@/components/Loader";
import { formatDisplayDate, formatTimeEncoded } from "@/lib/dateUtils";

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
  department?: { name: string };
  encoded_by_id?: number;
  encoded_by?: { name?: string } | null;
  created_at?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function MyDocumentsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Fetch documents encoded by current user
        const res = await fetch(
          `${API_BASE}/documents?encoded_by=${auth.user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ).then((r) => r.json());
        setDocuments(res.data ?? []);
      } catch (err: any) {
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
      <RoleGuard allowedRoles={["Encoder"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader size="lg" />
              <p className="text-lg text-gray-600">Loading your documents...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Encoder"]}>
      <MainLayout>
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Encoded Documents
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Documents you have created and encoded
            </p>
          </div>
          <Link
            href="/documents/new"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <span>➕</span>
            <span>Encode New Document</span>
          </Link>
        </div>

        {/* Documents List */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200">
          {documents.length > 0 ? (
            <>
              <div className="border-b border-gray-200 px-6 py-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Documents ({documents.length})
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
                      <tr
                        key={doc.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
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
                                  : auth.user?.name ?? "—")}
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
            </>
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
    </RoleGuard>
  );
}
