"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { getMenuItemsForRole, type MenuItem } from "@/config/menus";
import { useAuth } from "@/components/AuthProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  const menuItems: MenuItem[] = useMemo(() => {
    if (!user) return [];
    return getMenuItemsForRole(user.role);
  }, [user]);

  const handleLogout = () => {
    if (
      confirm(
        "Are you sure you want to logout? You'll need to sign in again to access the system."
      )
    ) {
      logout().finally(() => router.replace("/login"));
    }
  };

  // Don't show sidebar on login page
  if (pathname === "/login") return null;

  // Role-based header text
  const getRoleHeader = () => {
    if (!user) return "Monitoring System";
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
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-blue-900 text-white shadow-lg">
      {/* Logo/Header */}
      <div className="border-b border-blue-800 px-6 py-5">
        <h1 className="text-xl font-bold">City Hall</h1>
        <p className="mt-1 text-sm text-blue-200">{getRoleHeader()}</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="border-b border-blue-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 text-lg font-semibold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-medium">{user.name}</p>
              <p className="text-sm text-blue-300 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-2">
          {loading && (
            <li className="px-4 py-2 text-blue-200 text-sm">Loading menu...</li>
          )}
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3.5 text-base font-medium transition-all ${
                    isActive
                      ? "bg-blue-800 text-white shadow-md"
                      : "text-blue-100 hover:bg-blue-800/50 hover:text-white"
                  }`}
                  title={item.description}
                >
                  <span className="text-xl" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="border-t border-blue-800 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-base font-medium text-blue-100 transition-colors hover:bg-red-600 hover:text-white"
        >
          <span className="text-xl" aria-hidden="true">
            🚪
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
