"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";

type EditRequestUser = {
  id: number;
  name: string;
};

type EditRequestDocument = {
  id: number;
  document_code: string;
  document_number?: string | null;
};

type EditRequest = {
  id: number;
  document_id: number;
  status: "pending" | "accepted" | "rejected" | "expired" | "used";
  created_at: string;
  accepted_at?: string | null;
  expires_at?: string | null;
  remarks?: string | null;
  requested_by_user_id: number;
  requested_to_user_id: number;
  requested_by?: EditRequestUser;
  requested_to?: EditRequestUser;
  document?: EditRequestDocument;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export default function EditRequestNotifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState<EditRequest[]>([]);
  const [outgoing, setOutgoing] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("auth_token")
      : null;

  const hasPendingIncoming = incoming.some((r) => r.status === "pending");
  const hasNewOutgoing = outgoing.some(
    (r) => r.status === "accepted" || r.status === "rejected"
  );

  const badgeVisible = hasPendingIncoming || hasNewOutgoing;

  async function loadData() {
    if (!user || !token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [incomingRes, outgoingRes] = await Promise.all([
        fetch(`${API_BASE}/edit-requests/incoming`, { headers }).then((r) =>
          r.json()
        ),
        fetch(`${API_BASE}/edit-requests/outgoing`, { headers }).then((r) =>
          r.json()
        ),
      ]);
      setIncoming(incomingRes.data ?? []);
      setOutgoing(outgoingRes.data ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) {
      void loadData();
    }
  }, [open]);

  const notifications = useMemo(() => {
    const items: {
      id: string;
      kind: "incoming" | "outgoing";
      request: EditRequest;
      message: string;
      timestamp: string;
    }[] = [];

    for (const r of incoming) {
      const docRef = r.document?.document_number || r.document?.document_code;
      const name = r.requested_by?.name ?? `User #${r.requested_by_user_id}`;
      const msg = `User ${name} is requesting to edit Document ${docRef}.`;
      items.push({
        id: `in-${r.id}`,
        kind: "incoming",
        request: r,
        message: msg,
        timestamp: r.created_at,
      });
    }

    for (const r of outgoing) {
      if (r.status === "pending") continue;
      const docRef = r.document?.document_number || r.document?.document_code;
      const base = `Your edit request for Document ${docRef}`;
      const msg =
        r.status === "accepted"
          ? `${base} has been approved. You can edit it within the allowed time.`
          : r.status === "rejected"
          ? `${base} has been rejected.`
          : `${base} is no longer active.`;
      items.push({
        id: `out-${r.id}`,
        kind: "outgoing",
        request: r,
        message: msg,
        timestamp: r.updated_at ?? r.created_at,
      });
    }

    // Sort oldest -> newest for readability
    return items.sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp)
    );
  }, [incoming, outgoing]);

  async function handleDecision(
    request: EditRequest,
    decision: "accept" | "reject"
  ) {
    if (!token) return;
    const actionLabel = decision === "accept" ? "approve" : "reject";
    if (
      decision === "reject" &&
      !confirm("Are you sure you want to reject this edit request?")
    ) {
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/edit-requests/${request.id}/${decision}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed to ${actionLabel} request.`);
      }
      const updated: EditRequest = await res.json();
      setIncoming((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );
      // Reload outgoing so the requester sees the new status as a notification
      const headers = { Authorization: `Bearer ${token}` };
      const outgoingRes = await fetch(`${API_BASE}/edit-requests/outgoing`, {
        headers,
      }).then((r) => r.json());
      setOutgoing(outgoingRes.data ?? []);
    } catch (e: any) {
      alert(e.message || `Failed to ${actionLabel} request.`);
    }
  }

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700 shadow-sm transition hover:border-red-400 hover:text-red-600"
        aria-label="Notifications"
      >
        <span aria-hidden="true">🔔</span>
        {badgeVisible && (
          <span className="absolute right-1 top-1 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="border-b border-gray-200 px  -4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {loading && (
              <span className="flex items-center gap-2 text-xs text-gray-500">
                <Loader size="sm" />
                Loading…
              </span>
            )}
          </div>
          {error && (
            <div className="px-4 py-3 text-xs text-red-700 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}
          {notifications.length === 0 && !loading ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {notifications.map((n) => {
                const isIncoming = n.kind === "incoming";
                const req = n.request;
                const docRef =
                  req.document?.document_number || req.document?.document_code;
                return (
                  <li key={n.id} className="px-4 py-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {isIncoming ? "Edit request" : "Request update"}
                        </p>
                        <p className="mt-1 text-gray-700">{n.message}</p>
                        {isIncoming && (
                          <p className="mt-1 text-xs text-gray-500">
                            Document: {docRef}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {new Date(n.timestamp).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>
                      {isIncoming && req.status === "pending" && (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => handleDecision(req, "accept")}
                            className="rounded-md bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecision(req, "reject")}
                            className="rounded-md bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    {isIncoming && (
                      <div className="mt-2 text-xs">
                        <Link
                          href={`/documents/${req.document_id}/edit`}
                          className="text-blue-600 hover:underline"
                        >
                          Open document
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

