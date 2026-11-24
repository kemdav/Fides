"use client";

import { buttonClasses } from "@/components/ui/button";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ContinueToSignIn({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(href), 6000);
    return () => window.clearTimeout(timer);
  }, [href, router]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">You’ll be redirected to sign-in in a few seconds.</p>
      <Link className={buttonClasses({ variant: "brand", size: "form" })} href={href} replace>Continue to sign-in</Link>
    </div>
  );
}
