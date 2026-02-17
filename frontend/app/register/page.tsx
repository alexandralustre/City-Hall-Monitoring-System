"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api";
import Loader from "@/components/Loader";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({ name, email, password });
      setSuccess(res.message || "Registration submitted for admin approval.");
      // Redirect back to login after a short delay
      window.setTimeout(() => router.replace("/login"), 1200);
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 text-5xl">🏛️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Create Account
          </h1>
          <p className="text-base text-gray-500">
            Submit your details for admin approval
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg border border-gray-200">
          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="font-semibold text-red-800">Registration Failed</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="font-semibold text-green-800">Submitted</p>
              <p className="mt-1 text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Full Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="Juan Dela Cruz"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="your.email@cityhall.local"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="Create a password"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-2 block text-base font-semibold text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 focus:border-[#7b2c3d] focus:outline-none focus:ring-2 focus:ring-[#7b2c3d]/20 transition-all"
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7b2c3d] to-[#9b3d4d] px-6 py-4 text-base font-semibold text-white shadow-md hover:from-[#6b2433] hover:to-[#8b3545] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-300 ease-in-out active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader size="sm" variant="light" />
                  <span>Processing...</span>
                </>
              ) : (
                "Submit for Approval"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link className="font-semibold text-[#7b2c3d] hover:text-[#6b2433] hover:underline transition-colors" href="/login">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

