"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";
import Loader from "@/components/Loader";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutToast, setLogoutToast] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("logged_out") === "1") {
      setLogoutToast(true);
      router.replace("/login");
      const t = setTimeout(() => setLogoutToast(false), 4000);
      return () => clearTimeout(t);
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      await auth.refresh();
      router.replace("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      {/* Logout success toast */}
      {logoutToast && (
        <div
          className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-green-200 bg-green-50 px-6 py-3 shadow-lg animate-modal-overlay"
          role="status"
        >
          <p className="text-sm font-medium text-green-800">
            Successfully logged out.
          </p>
        </div>
      )}
      <div className="w-full max-w-md">
        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 text-5xl">🏛️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              City Hall Monitoring System
            </h1>
            <p className="text-base text-gray-500">
              Secure Access Portal
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">Login Failed</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="Enter your City Hall email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-6 py-4 text-base font-semibold text-white shadow-md hover:from-[#6b2433] hover:to-[#8b3545] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 ease-in-out active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader size="md" variant="light" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>🔒</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Create New Account Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">
              Don&apos;t have an account?
            </p>
            <Link
              href="/register"
              className="flex w-full items-center justify-center rounded-xl border-2 border-[#7b2c3d] bg-white px-6 py-3 text-base font-semibold text-[#7b2c3d] shadow-sm transition-all duration-300 ease-in-out hover:border-transparent hover:bg-gradient-to-r hover:from-[#7b2c3d] hover:to-[#9b3d4d] hover:text-white hover:shadow-md active:scale-[0.98]"
            >
              Create New Account
            </Link>
            <p className="mt-3 text-center text-xs text-gray-500">
              New account requests require admin approval.
            </p>
          </div>

          {/* Footer Help Section */}
          <div className="mt-6 rounded-xl bg-gray-50 p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
              <strong className="text-gray-700">Need help?</strong> Contact your system administrator if you forgot your password or need account access.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          © City Hall Monitoring System
        </p>
      </div>
    </div>
  );
}
