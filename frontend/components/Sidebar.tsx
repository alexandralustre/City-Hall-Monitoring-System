"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getMenuItemsForRole, type MenuItem } from "@/config/menus";
import Loader from "@/components/Loader";
import { useAuth } from "@/components/AuthProvider";
import LogoutConfirmModal from "@/components/LogoutConfirmModal";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Ensure the first client render matches the server output to avoid
  // hydration mismatches. We only show role-specific header text after
  // hydration has completed on the client.
  useEffect(() => {
    setHydrated(true);
  }, []);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!user) return [];
    return getMenuItemsForRole(user.role);
  }, [user]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.replace("/login?logged_out=1");
    } finally {
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    if (!logoutLoading) setShowLogoutModal(false);
  };

  // Don't show sidebar on login page
  if (pathname === "/login") return null;

  // Role-based header text. To keep SSR and first client render identical,
  // we default to a static label until the component has hydrated.
  const getRoleHeader = () => {
    if (!hydrated || !user) return "Monitoring System";
    switch (user.role) {
      case "Admin":
        return "Admin Panel";
      case "Encoder":
        return "Encoder Workspace";
      case "Viewer":
        return "Viewer Access";
      default:
        return "Monitoring System";
    }
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-red-800 via-red-700 to-red-600 text-white shadow-2xl">
      <div className="flex h-full flex-col">
        {/* Logo / system title */}
        <div className="flex items-center gap-3 border-b border-red-500/40 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wide">
            <span>CH</span>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-100">
              City Hall
            </p>
            <p className="text-sm font-semibold">Monitoring System</p>
          </div>
        </div>

        {/* Role context */}
        <div className="border-b border-red-500/30 px-5 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-red-100">
            Workspace
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {getRoleHeader()}
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-2">
            {loading && (
              <li className="flex items-center gap-2 px-4 py-2 text-sm text-red-100/80">
                <Loader size="sm" variant="light" />
                Loading menu...
              </li>
            )}
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/15 text-white shadow-md"
                        : "text-red-100 hover:bg-white/10 hover:text-white"
                    }`}
                    title={item.description}
                  >
                    <span className="text-lg" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Settings + user profile + logout */}
        <div className="border-t border-red-500/40 px-5 py-4 space-y-3">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-red-50 transition hover:bg-white/10"
          >
            <span className="text-lg" aria-hidden="true">
              ⚙️
            </span>
            <span>Settings</span>
          </button>

          {user && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {user.name}
                  </p>
                  <p className="text-xs text-red-100">
                    {user.role} · Signed in
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogoutClick}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/5 text-sm font-medium text-red-50 transition hover:bg-red-500 hover:text-white"
                aria-label="Logout"
              >
                <span aria-hidden="true">⏏</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <LogoutConfirmModal
        open={showLogoutModal}
        loading={logoutLoading}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </aside>
  );
}
