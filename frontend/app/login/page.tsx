"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      // Ensure AuthProvider has the latest user state
      await auth.refresh();
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🏛️</div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            City Hall Monitoring System
          </h1>
          <p className="text-lg text-gray-600">
            Sign in to access your account
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-gray-200">
          {error && (
            <div className="mb-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-semibold text-red-800">Login Failed</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-base font-semibold text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="your.email@cityhall.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your City Hall email address
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-base font-semibold text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                className="block w-full rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter your account password
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>🔐</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-100">
            <p className="text-sm text-blue-800">
              <strong>Need help?</strong> Contact your system administrator if
              you forgot your password or need account access.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-600">
          © {new Date().getFullYear()} City Hall Monitoring System
        </p>
      </div>
    </div>
  );
}

