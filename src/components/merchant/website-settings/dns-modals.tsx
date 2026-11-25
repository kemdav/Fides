"use client";

import * as React from "react";
import { PLATFORM_IP, PLATFORM_DOMAIN } from "@/lib/tenant/constants";
import { checkCustomDomainDnsAction } from "@/app/actions/website-settings";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/admin/icon";

interface ConnectDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  verificationToken?: string;
  tenantId?: string;
  onVerified?: () => void;
  onCheckStatus?: () => void;
}

export function ConnectDomainModal({
  isOpen,
  onClose,
  domainName,
  verificationToken,
  tenantId,
  onVerified,
  onCheckStatus,
}: ConnectDomainModalProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const [checkResult, setCheckResult] = React.useState<{
    status: "active" | "pending_dns" | "error";
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const domain = domainName || "www.bellavita.example";
  const rootDomain = domain.replace(/^www\./, "");
  const dynamicTxtToken =
    verificationToken || `fides-site-verification=${tenantId || "site"}`;
  const cnameHost = `domains.${PLATFORM_DOMAIN}`;

  const handleCheckDnsStatus = async () => {
    setIsChecking(true);
    setCheckResult(null);

    try {
      const res = await checkCustomDomainDnsAction(domain, tenantId);
      if (res.success && res.data) {
        if (res.data.status === "active") {
          setCheckResult({
            status: "active",
            message:
              "Domain verified and active! Your custom domain is now connected.",
          });
          onVerified?.();
        } else {
          setCheckResult({
            status: "pending_dns",
            message:
              "DNS records pending propagation. Please allow up to 24-48 hours for your registrar changes to propagate.",
          });
          onCheckStatus?.();
        }
      } else {
        setCheckResult({
          status: "error",
          message:
            ("error" in res && res.error) ||
            "DNS check failed. Please check your domain name.",
        });
      }
    } catch (err: unknown) {
      setCheckResult({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to verify DNS.",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="connect-domain-title" unstyled className="w-[calc(100%-1rem)] max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-hairline text-ink">
        <div className="mb-4">
          <h3
            id="connect-domain-title"
            className="text-base font-semibold text-ink"
          >
            Connect your domain
          </h3>
          <p className="mt-1 text-xs text-subtle">
            Verify ownership, then add the routing record for the website address you want to use.
          </p>
        </div>

        <div className="mt-5 space-y-6">
          {/* Step 1: Verify Ownership */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-ink flex items-center gap-2">
              <span>1 · Verify domain ownership</span>
            </h4>
            <div className="rounded-xl border border-hairline bg-mist/70 p-4 space-y-3">
              <span className="inline-block text-xs font-semibold text-body bg-white border border-hairline px-2 py-0.5 rounded-md">
                TXT · Required ownership record
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-subtle font-medium">Host / Name</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span>@</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("@", "txt-host")}
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans ml-2"
                    >
                      {copiedKey === "txt-host" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-subtle font-medium">Value</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span className="truncate mr-2">{dynamicTxtToken}</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(dynamicTxtToken, "txt-val")
                      }
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans shrink-0"
                    >
                      {copiedKey === "txt-val" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Route Domain */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-ink">
              2 · Route your domain (choose the matching address)
            </h4>

            {/* CNAME option */}
            <div className="rounded-xl border border-hairline bg-mist/70 p-4 space-y-3">
              <span className="inline-block text-xs font-semibold text-body bg-white border border-hairline px-2 py-0.5 rounded-md">
                CNAME · For {domain.startsWith("www.") ? domain : `www.${domain}`}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-subtle font-medium">Host / Name</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span>www</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("www", "cname-host")}
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans ml-2"
                    >
                      {copiedKey === "cname-host" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-subtle font-medium">Value</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span className="truncate mr-2">{cnameHost}</span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(cnameHost, "cname-val")
                      }
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans shrink-0"
                    >
                      {copiedKey === "cname-val" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* A record option */}
            <div className="rounded-xl border border-hairline bg-mist/70 p-4 space-y-3">
              <span className="inline-block text-xs font-semibold text-body bg-white border border-hairline px-2 py-0.5 rounded-md">
                A · For {rootDomain} (root domain)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-subtle font-medium">Host / Name</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span>@</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("@", "a-host")}
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans ml-2"
                    >
                      {copiedKey === "a-host" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-subtle font-medium">Value</span>
                  <div className="mt-1 flex items-center justify-between bg-white border border-hairline rounded-lg px-3 py-2 font-mono text-ink">
                    <span>{PLATFORM_IP}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(PLATFORM_IP, "a-val")}
                      className="text-xs text-muted hover:text-ink flex items-center gap-1 font-sans shrink-0"
                    >
                      {copiedKey === "a-val" ? (
                        <>
                          <Icon name="check" weight="bold" className="w-3.5 h-3.5 text-success" />
                          <span className="text-success-deep font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Icon name="copy" className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Result / Pending status advisory (QA #12) */}
          {checkResult ? (
            <div
              className={`rounded-lg border p-4 text-xs ${
                checkResult.status === "active"
                  ? "bg-wash/80 border-success/30 text-success-deep"
                  : checkResult.status === "pending_dns"
                  ? "bg-warn-bg/80 border-warn-bg text-warn-fg"
                  : "bg-danger-bg/80 border-danger/30 text-danger-dark"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5 font-semibold">
                {checkResult.status === "active" ? (
                  <Icon name="check" weight="bold" className="w-4 h-4 text-success" />
                ) : (
                  <Icon name="alert" className="w-4 h-4 text-warn-fg" />
                )}
                <span>
                  {checkResult.status === "active"
                    ? "Domain Verified & Active"
                    : checkResult.status === "pending_dns"
                      ? "Pending DNS Setup"
                      : "DNS Check Error"}
                </span>
              </div>
              <p className="leading-relaxed opacity-90">
                {checkResult.message}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-warn-bg/70 border border-warn-bg/80 p-4 text-xs text-warn-fg">
              <div className="flex items-center gap-2 mb-1.5 font-semibold text-warn-fg">
                <span className="w-2 h-2 rounded-full bg-warn-fg animate-pulse" />
                <span>Pending DNS setup</span>
              </div>
              <p className="leading-relaxed text-warn-fg">
                Add the TXT record, then configure either www (CNAME) or the root domain (A record).
                DNS changes can take time to propagate. Your Fides website address stays available.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-mist">
          <a
            href="https://fides.app/help/dns"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm font-medium text-body bg-white border border-line hover:bg-mist rounded-lg shadow-2xs transition"
          >
            Troubleshoot
          </a>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-body bg-white border border-line hover:bg-mist rounded-lg shadow-2xs transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isChecking}
              onClick={handleCheckDnsStatus}
              className="px-4 py-2 text-sm font-medium text-on-burnt bg-burnt hover:bg-burnt-dark disabled:opacity-60 rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              {isChecking ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Checking DNS...</span>
                </>
              ) : (
                <span>Check DNS status</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
  );
}

interface WaitingDnsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WaitingDnsModal({ isOpen, onClose }: WaitingDnsModalProps) {
  if (!isOpen) return null;

  return (
    <Modal open onClose={onClose} labelledBy="waiting-dns-title" unstyled className="w-[calc(100%-1rem)] max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-hairline overflow-visible text-ink">
        <div className="mb-4">
          <h3
            id="waiting-dns-title"
            className="text-base font-semibold text-ink"
          >
            Waiting for your DNS record
          </h3>
          <p className="mt-1 text-xs text-subtle leading-relaxed">
            Your domain connection is not ready yet. Review your DNS record and check again after the changes have propagated.
          </p>
        </div>

        <div className="mt-4 rounded-xl bg-warn-bg/80 border border-warn-bg/80 p-3.5 space-y-1.5">
          <span className="inline-block text-xs font-semibold text-warn-fg bg-warn-bg/90 px-2.5 py-0.5 rounded-full">
            Pending DNS setup
          </span>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-body bg-white border border-line hover:bg-mist rounded-xl shadow-2xs transition"
          >
            Close
          </button>
        </div>
      </Modal>
  );
}
