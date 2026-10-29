"use client";

import { useState } from "react";
import { login, signup, requestPasswordReset } from "@/app/actions/auth";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
} from "@/lib/validations/auth";

interface LoginFormProps {
  initialTab?: "login" | "signup" | "forgot";
  errorMessage?: string;
  infoMessage?: string;
  redirectUrl?: string;
}

export function LoginForm({
  initialTab = "login",
  errorMessage,
  infoMessage,
  redirectUrl,
}: LoginFormProps) {
  const [tab, setTab] = useState<"login" | "signup" | "forgot">(initialTab);
  const [clientError, setClientError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client-side validation before submission
  const handleClientValidation = (e: React.FormEvent<HTMLFormElement>) => {
    setClientError(null);
    setFieldErrors({});

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email")?.toString() || "";
    const password = formData.get("password")?.toString() || "";

    if (tab === "login") {
      const result = loginSchema.safeParse({ email, password });
      if (!result.success) {
        e.preventDefault();
        const formatted: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0]?.toString() || "form";
          formatted[key] = issue.message;
        }
        setFieldErrors(formatted);
        setClientError(
          result.error.issues[0]?.message || "Invalid credentials.",
        );
        return false;
      }
    } else if (tab === "signup") {
      const fullName = formData.get("fullName")?.toString() || "";
      const confirmPassword = formData.get("confirmPassword")?.toString() || "";

      const result = signupSchema.safeParse({
        fullName,
        email,
        password,
        confirmPassword,
      });

      if (!result.success) {
        e.preventDefault();
        const formatted: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0]?.toString() || "form";
          formatted[key] = issue.message;
        }
        setFieldErrors(formatted);
        setClientError(result.error.issues[0]?.message || "Validation failed.");
        return false;
      }
    } else if (tab === "forgot") {
      const result = forgotPasswordSchema.safeParse({ email });
      if (!result.success) {
        e.preventDefault();
        const formatted: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0]?.toString() || "form";
          formatted[key] = issue.message;
        }
        setFieldErrors(formatted);
        setClientError(result.error.issues[0]?.message || "Invalid email.");
        return false;
      }
    }

    setIsSubmitting(true);
    return true;
  };

  const activeError = clientError || errorMessage;

  return (
    <div className="w-full max-w-md bg-white border border-neutral-200 rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <header className="space-y-1 text-center sm:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {tab === "login" && "Sign In"}
          {tab === "signup" && "Create an Account"}
          {tab === "forgot" && "Reset Password"}
        </h1>
        <p className="text-sm text-neutral-500">
          {tab === "login" && "Enter your credentials to access your dashboard"}
          {tab === "signup" && "Sign up to manage your operations on Fides"}
          {tab === "forgot" &&
            "We'll send a secure password reset link to your email"}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200">
        <button
          type="button"
          onClick={() => {
            setTab("login");
            setClientError(null);
            setFieldErrors({});
          }}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 cursor-pointer transition ${
            tab === "login"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("signup");
            setClientError(null);
            setFieldErrors({});
          }}
          className={`flex-1 pb-3 text-sm font-medium border-b-2 cursor-pointer transition ${
            tab === "signup"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Register
        </button>
      </div>

      {/* Dynamic Alerts */}
      {activeError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700 flex items-start gap-2.5"
        >
          <span className="text-base leading-none">⚠️</span>
          <div className="flex-1 font-medium">{activeError}</div>
        </div>
      )}

      {infoMessage && !activeError && (
        <div
          role="status"
          className="rounded-lg bg-blue-50 border border-blue-200 p-3.5 text-sm text-blue-800 flex items-start gap-2.5"
        >
          <span className="text-base leading-none">ℹ️</span>
          <div className="flex-1 font-medium">{infoMessage}</div>
        </div>
      )}

      {/* Form Area */}
      {tab === "login" && (
        <form
          action={login}
          onSubmit={handleClientValidation}
          className="space-y-4"
          noValidate
        >
          {redirectUrl && (
            <input type="hidden" name="redirect" value={redirectUrl} />
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@business.com"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.email
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-neutral-700"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setTab("forgot");
                  setClientError(null);
                  setFieldErrors({});
                }}
                className="text-xs text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}

      {tab === "signup" && (
        <form
          action={signup}
          onSubmit={handleClientValidation}
          className="space-y-4"
          noValidate
        >
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Full Name (Optional)
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition"
            />
          </div>

          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Work Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="jane@example.com"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.email
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Password (min. 8 characters)
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.confirmPassword
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>
      )}

      {tab === "forgot" && (
        <form
          action={requestPasswordReset}
          onSubmit={handleClientValidation}
          className="space-y-4"
          noValidate
        >
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Registered Email
            </label>
            <input
              id="reset-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@business.com"
              className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
                fieldErrors.email
                  ? "border-red-500 focus:ring-1 focus:ring-red-500"
                  : "border-neutral-300 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              }`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Sending link..." : "Send Reset Link"}
          </button>

          <button
            type="button"
            onClick={() => {
              setTab("login");
              setClientError(null);
              setFieldErrors({});
            }}
            className="w-full text-center text-xs text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
          >
            Back to Sign In
          </button>
        </form>
      )}
    </div>
  );
}
