"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DocumentForm, { DocumentPayload } from "@/components/DocumentForm";
import { clearAuthToken } from "@/lib/api";
import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";
import { cachedJson } from "@/lib/cache";

type Department = { id: number; name: string; code: string };

type DocumentApi = DocumentPayload & {
  id: number;
  document_code: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const documentId = params?.id;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [doc, setDoc] = useState<DocumentApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  useEffect(() => {
    async function init() {
      try {
        const [depsRes, docRes] = await Promise.all([
          cachedJson(
            "departments:per_page=200",
            async () => {
              const r = await fetch(`${API_BASE}/departments?per_page=200`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!r.ok) throw new Error("Failed to load departments");
              return r.json();
            },
            10 * 60 * 1000
          ),
          fetch(`${API_BASE}/documents/${documentId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(async (r) => {
            if (!r.ok) throw new Error("Failed to load document");
            return r.json();
          }),
        ]);

        setDepartments(depsRes.data ?? []);
        setDoc({
          id: docRes.id,
          document_code: docRes.document_code,
          date: docRes.date,
          type_of_document: docRes.type_of_document,
          document_number: docRes.document_number ?? "",
          pay_claimant: docRes.pay_claimant,
          particular: docRes.particular,
          amount: Number(docRes.amount),
          department_id: Number(docRes.department_id),
          status: docRes.status,
          remarks: docRes.remarks ?? "",
          date_out: docRes.date_out ?? "",
        });
      } catch (err: any) {
        setError(err.message || "Failed to load");
        clearAuthToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router, token, documentId]);

  async function handleUpdate(payload: DocumentPayload) {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || "Failed to update document");
    }
    router.push("/documents");
  }

  if (loading) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder"]}>
        <MainLayout>
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-4xl">⏳</div>
              <p className="text-lg text-gray-600">Loading document...</p>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  if (error || !doc) {
    return (
      <RoleGuard allowedRoles={["Admin", "Encoder"]}>
        <MainLayout>
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="mt-1 text-base text-red-700">
                  {error ?? "Document not found"}
                </p>
              </div>
            </div>
          </div>
        </MainLayout>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["Admin", "Encoder"]}>
      <MainLayout>
        <DocumentForm
          title="Edit Document"
          initial={doc}
          departments={departments}
          onSubmit={handleUpdate}
          submitLabel="Save Changes"
        />
      </MainLayout>
    </RoleGuard>
  );
}

