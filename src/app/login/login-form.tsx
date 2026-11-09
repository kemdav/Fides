"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm({ submitted }: { submitted: boolean }) {
  const [state, action, pending] = useActionState(login, initialState);
  const [show, setShow] = useState(false);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-powder px-4 py-8 sm:px-8">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-[360px] rounded-full bg-burnt/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-24 size-[420px] rounded-full bg-burnt/10" />

      <div className="relative grid w-full max-w-[1040px] overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-12px_rgb(44_58_75/0.25)] md:grid-cols-[1fr_1.05fr]">
        <aside className="relative flex flex-col items-center justify-between gap-4 bg-[#faecd3] px-6 pb-8 pt-8 text-center md:px-10 md:pb-12 md:pt-12 md:text-left">
          <div className="flex w-full flex-col gap-1 md:items-start">
            <Link href="/" className="font-display text-4xl text-burnt md:text-[40px]">
              Fides
            </Link>
            <p className="text-sm text-burnt/90">Manage and grow your service business</p>
          </div>
          <div className="relative aspect-[466/508] w-[200px] max-w-full sm:w-[240px] md:w-full md:max-w-[340px]">
            <Image
              src="/images/mascot/fox-mascot.png"
              alt="Fides fox mascot waving"
              fill
              priority
              sizes="(min-width: 768px) 340px, 240px"
              className="object-contain"
            />
          </div>
          <p className="hidden max-w-[320px] text-sm text-muted md:block">
            Bookings, schedules, customers, and reports — all in one place.
          </p>
        </aside>

        <section className="flex flex-col justify-center gap-6 px-6 py-8 sm:px-10 md:py-14">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Welcome back</h1>
            <p className="text-sm text-muted">Log in to manage your business on Fides.</p>
          </div>

          {submitted ? (
            <p role="status" className="rounded-lg bg-wash px-4 py-3 text-sm text-success">
              Application received. You can log in once an administrator approves it — we will email you.
            </p>
          ) : null}

          <form action={action} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-ink">
                Business Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={state.email}
                placeholder="maria@bellavita.ph"
                className="h-12 w-full rounded-lg border border-outline/60 bg-white px-4 text-base text-ink placeholder:text-subtle focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-semibold text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-lg border border-outline/60 bg-white pl-4 pr-20 text-base text-ink placeholder:text-subtle focus-visible:border-burnt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-burnt/30"
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  aria-pressed={show}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-xs font-semibold text-burnt hover:bg-burnt/10"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {state.error ? (
              <p role="alert" className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger-dark">
                {state.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className={cn(buttonClasses({ variant: "brand", size: "cta" }), "w-full text-base")}
            >
              {pending ? "Logging in…" : "Log in"}
            </button>
          </form>

          <p className="text-center text-sm text-muted">
            New to Fides?{" "}
            <Link href="/register" className="font-semibold text-burnt underline underline-offset-2 hover:text-burnt-dark">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
