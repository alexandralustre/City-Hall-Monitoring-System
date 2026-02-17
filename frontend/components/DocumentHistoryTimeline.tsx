"use client";

import { useEffect, useState } from "react";
import Loader from "@/components/Loader";
import { formatDateTimeEncoded } from "@/lib/dateUtils";

export type HistoryEntry = {
  id: number;
  action_type: string;
  previous_status: string | null;
  new_status: string | null;
  user_name: string | null;
  user_role: string | null;
  department: string | null;
  remarks: string | null;
  created_at: string;
};

type DocumentHistoryTimelineProps = {
  documentId: string;
  token: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function DocumentHistoryTimeline({
  documentId,
  token,
}: DocumentHistoryTimelineProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setError(null);
        const res = await fetch(
          `${API_BASE}/documents/${documentId}/history`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || "Failed to load history");
        }
        const data = await res.json();
        if (!cancelled) setEntries(data.data ?? []);
      } catch (e: unknown) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, token]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 py-12">
        <Loader size="lg" />
        <p className="text-gray-600">Loading history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-800">{error}</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-8 text-center">
        <p className="text-gray-600">No history recorded for this document yet.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div
        className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"
        aria-hidden
      />
      <ul className="space-y-0">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {/* Dot */}
            <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
              <div className="h-2 w-2 rounded-full bg-gray-500" />
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-gray-900">
                  {entry.action_type}
                </span>
                {(entry.previous_status != null || entry.new_status != null) && (
                  <span className="text-sm text-gray-600">
                    {entry.previous_status != null && entry.new_status != null
                      ? `${entry.previous_status} → ${entry.new_status}`
                      : entry.new_status != null
                        ? `→ ${entry.new_status}`
                        : entry.previous_status != null
                          ? `${entry.previous_status} →`
                          : null}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                {entry.user_name != null && (
                  <span>
                    {entry.user_name}
                    {entry.user_role != null && (
                      <span className="text-gray-500"> · {entry.user_role}</span>
                    )}
                  </span>
                )}
                {entry.department != null && (
                  <span>{entry.department}</span>
                )}
              </div>
              {entry.remarks != null && entry.remarks.trim() !== "" && (
                <p className="mt-2 text-sm text-gray-700 border-l-2 border-gray-200 pl-3">
                  {entry.remarks}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                {formatDateTimeEncoded(entry.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
