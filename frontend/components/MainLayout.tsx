"use client";

import { useMemo } from "react";
import Sidebar from "./Sidebar";
import EditRequestNotifications from "./EditRequestNotifications";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const todayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <Sidebar />
      <div className="ml-64 flex flex-1 flex-col">
        {/* Top bar with search + date + notifications */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-gray-100/90 px-8 py-4 backdrop-blur">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-400">
                <span className="text-lg" aria-hidden="true">
                  🔍
                </span>
              </span>
              <input
                type="search"
                placeholder="Search…"
                className="w-full rounded-full border border-gray-300 bg-white/90 px-4 py-2.5 pl-11 text-sm shadow-sm outline-none ring-0 transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>

          <div className="ml-6 flex items-center gap-6 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">
                📅
              </span>
              <span className="font-medium">{todayLabel}</span>
            </div>

            <EditRequestNotifications />
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
