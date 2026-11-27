"use client";

import { useEffect, useRef } from "react";
import type { ReactElement } from "react";

export function AppointmentCheckInCode({ code }: { code: string }): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    void import("qrcode").then(async ({ toCanvas }) => {
      if (!active) return;
      await toCanvas(canvas, code, { width: 144 });
      if (active) canvas.hidden = false;
    }).catch(() => {
      if (active) canvas.hidden = true;
    });
    return () => { active = false; };
  }, [code]);

  return (
    <div className="space-y-2 rounded-xl bg-mist p-4">
      <p className="text-sm font-semibold">Check-in code</p>
      <canvas ref={canvasRef} hidden role="img" aria-label="Appointment check-in QR code" className="rounded-md" />
      <p className="break-all font-mono text-sm text-ink">{code}</p>
    </div>
  );
}
