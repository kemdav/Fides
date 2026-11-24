"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLinkButton } from "@/components/admin/admin-button";

export function ContinueToSignIn({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace(href), 6000);
    return () => window.clearTimeout(timer);
  }, [href, router]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">You’ll be redirected to sign-in in a few seconds.</p>
      <AdminLinkButton href={href} replace>Continue to sign-in</AdminLinkButton>
    </div>
  );
}
