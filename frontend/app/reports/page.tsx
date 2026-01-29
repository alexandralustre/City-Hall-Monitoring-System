"use client";

import MainLayout from "@/components/MainLayout";
import RoleGuard from "@/components/RoleGuard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function ReportsPage() {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  return (
    <RoleGuard allowedRoles={["Admin"]}>
      <MainLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports & Export</h1>
          <p className="mt-2 text-lg text-gray-600">
            Generate reports and export data
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Export Documents
            </h2>
            <p className="mb-4 text-base text-gray-600">
              Export document data to Excel or PDF format
            </p>
            <div className="flex gap-3">
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

          <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              System Reports
            </h2>
            <p className="mb-4 text-base text-gray-600">
              View detailed system reports and analytics
            </p>
            <p className="text-sm text-gray-500">
              More reporting features coming soon...
            </p>
          </div>
        </div>
      </MainLayout>
    </RoleGuard>
  );
}
