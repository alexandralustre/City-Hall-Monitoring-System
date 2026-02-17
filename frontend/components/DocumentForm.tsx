"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";

type Department = { id: number; name: string; code: string };

export type DocumentPayload = {
  date: string;
  type_of_document: string;
  document_number?: string | null;
  pay_claimant: string;
  particular: string;
  amount: number;
  department_id: number;
  status: string;
  remarks?: string | null;
  date_out?: string | null;
};

type Props = {
  title: string;
  initial?: Partial<DocumentPayload> & { document_code?: string };
  departments: Department[];
  onSubmit: (payload: DocumentPayload) => Promise<void>;
  submitLabel: string;
};

export default function DocumentForm({
  title,
  initial,
  departments,
  onSubmit,
  submitLabel,
}: Props) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [date, setDate] = useState(initial?.date ?? today);
  const [typeOfDocument, setTypeOfDocument] = useState(
    initial?.type_of_document ?? ""
  );
  const [documentNumber, setDocumentNumber] = useState(
    initial?.document_number ?? ""
  );
  const [payClaimant, setPayClaimant] = useState(
    initial?.pay_claimant ?? ""
  );
  const [particular, setParticular] = useState(initial?.particular ?? "");
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0);
  const [departmentId, setDepartmentId] = useState<number>(
    initial?.department_id ?? (departments[0]?.id ?? 0)
  );
  const [status, setStatus] = useState(initial?.status ?? "For Signature");
  const [remarks, setRemarks] = useState(initial?.remarks ?? "");
  const [dateOut, setDateOut] = useState(initial?.date_out ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!departmentId && departments.length > 0) {
      setDepartmentId(departments[0].id);
    }
  }, [departments, departmentId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        date,
        type_of_document: typeOfDocument,
        document_number: documentNumber || null,
        pay_claimant: payClaimant,
        particular,
        amount: Number(amount),
        department_id: Number(departmentId),
        status,
        remarks: remarks || null,
        date_out: dateOut || null,
      });
    } catch (err: any) {
      setError(err.message || "Save failed. Please check all fields.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-base text-gray-600">
          Fill in all required fields below. The document code will be automatically generated.
        </p>
      </div>

      {/* Document Code (if editing) */}
      {initial?.document_code && (
        <div className="mb-6 rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Document Code (Auto-generated)
          </label>
          <input
            value={initial.document_code}
            readOnly
            className="w-full rounded-lg border-2 border-blue-300 bg-white px-4 py-3 font-mono text-base font-semibold text-gray-900"
          />
          <p className="mt-2 text-sm text-gray-600">
            This code is automatically generated and cannot be changed.
          </p>
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

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Row 1: Date and Department */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Document Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Select the date of the document
            </p>
          </div>

          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Requesting Department <span className="text-red-500">*</span>
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(Number(e.target.value))}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              required
            >
              {departments.length > 0 ? (
                departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))
              ) : (
                <option value="">No departments available</option>
              )}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Select the department requesting this document
            </p>
          </div>
        </div>

        {/* Row 2: Type and Document Number */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Type of Document <span className="text-red-500">*</span>
            </label>
            <input
              value={typeOfDocument}
              onChange={(e) => setTypeOfDocument(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="e.g., Disbursement Voucher (DV), Purchase Order (PO)"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the type of document (e.g., DV, PO, PR)
            </p>
          </div>

          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Document Number
            </label>
            <input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="e.g., DV-001-2026"
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Enter the manual document reference number
            </p>
          </div>
        </div>

        {/* Row 3: Pay Claimant and Amount */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Pay Claimant <span className="text-red-500">*</span>
            </label>
            <input
              value={payClaimant}
              onChange={(e) => setPayClaimant(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              placeholder="Name of person or entity to be paid"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the name of the person or company receiving payment
            </p>
          </div>

          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Amount (₱) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-semibold text-gray-600">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border-2 border-gray-300 pl-10 pr-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="0.00"
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter the amount in pesos (e.g., 5000.00)
            </p>
          </div>
        </div>

        {/* Row 4: Status and Date Out */}
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
              required
            >
              <option value="For Signature">For Signature</option>
              <option value="For Review">For Review</option>
              <option value="For Initial">For Initial</option>
              <option value="For Schedule">For Schedule</option>
              <option value="Signed">Signed</option>
              <option value="Filed">Filed</option>
              <option value="Returned">Returned</option>
              <option value="Hold">Hold</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Current status of this document
            </p>
          </div>

          <div>
            <label className="mb-2 block text-base font-semibold text-gray-700">
              Date Out (Returned to Department)
            </label>
            <input
              type="date"
              value={dateOut}
              onChange={(e) => setDateOut(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional: Date when document was returned to the department
            </p>
          </div>
        </div>

        {/* Particular */}
        <div>
          <label className="mb-2 block text-base font-semibold text-gray-700">
            Particular <span className="text-red-500">*</span>
          </label>
          <textarea
            value={particular}
            onChange={(e) => setParticular(e.target.value)}
            rows={4}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Describe what this document is for..."
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Provide a detailed description of what this document is for
          </p>
        </div>

        {/* Remarks */}
        <div>
          <label className="mb-2 block text-base font-semibold text-gray-700">
            Remarks
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
            placeholder="Any additional notes or comments..."
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional: Add any additional notes or comments
          </p>
        </div>
      </div>

      {/* Form Actions */}
      <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/documents"
          className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          ← Cancel
        </Link>
        <button
          type="submit"
          disabled={loading || !departmentId}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-8 py-3 text-base font-semibold text-white shadow-md hover:from-[#6b2433] hover:to-[#8b3545] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 ease-in-out active:scale-[0.98]"
        >
          {loading ? (
            <>
              <Loader size="sm" variant="light" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>{submitLabel}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
