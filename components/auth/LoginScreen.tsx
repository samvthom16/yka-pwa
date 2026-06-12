"use client";

import { useState, useRef } from "react";
import { sendOtp, verifyOtp } from "@/lib/api/auth";
import type { WPUser } from "@/lib/api/auth";

interface Props {
  onLogin: (user: WPUser) => void;
}

type Step = "email" | "otp";

export default function LoginScreen({ onLogin }: Props) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError("");
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStep("otp");
      setTimeout(() => otpRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setError("");
    setLoading(true);
    try {
      const user = await verifyOtp(email.trim(), otp.trim());
      onLogin(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">YKA Editor</h1>
          <p className="mt-2 text-sm text-gray-400">Sign in to start writing</p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} noValidate>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              autoComplete="email"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-400 transition-colors"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="mt-4 w-full bg-gray-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} noValidate>
            <p className="text-sm text-gray-500 mb-5">
              A one-time code was sent to <span className="font-medium text-gray-800">{email}</span>.
            </p>
            <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
              One-time code
            </label>
            <input
              ref={otpRef}
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="••••••"
              autoComplete="one-time-code"
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-400 transition-colors tracking-widest text-center"
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !otp.trim()}
              className="mt-4 w-full bg-gray-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setOtp(""); setError(""); }}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
