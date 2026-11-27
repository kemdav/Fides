import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { Icon } from "@/components/admin/icon";

const SCAN_INTERVAL_MS = 200;
const SCAN_MAX_WIDTH = 640;

export function QrCamera({ onScan }: { onScan: (code: string) => void }): ReactElement {
  const preview = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"opening" | "ready" | "unavailable">("opening");

  useEffect(() => {
    const video = preview.current;
    if (!video) return;

    let active = true;
    let stream: MediaStream | undefined;
    let timer: number | undefined;

    async function start(video: HTMLVideoElement) {
      try {
        const { default: decode } = await import("jsqr");
        if (!active) return;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context || !navigator.mediaDevices?.getUserMedia) {
          setStatus("unavailable");
          return;
        }

        const camera = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        if (!active) {
          camera.getTracks().forEach((track) => track.stop());
          return;
        }

        stream = camera;
        video.srcObject = camera;
        await video.play();
        if (!active) return;
        setStatus("ready");

        timer = window.setInterval(() => {
          if (!video.videoWidth || video.readyState < video.HAVE_CURRENT_DATA) return;
          const width = Math.min(video.videoWidth, SCAN_MAX_WIDTH);
          const height = Math.round(video.videoHeight * width / video.videoWidth);
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }
          context.drawImage(video, 0, 0, width, height);
          const frame = context.getImageData(0, 0, width, height);
          const qr = decode(frame.data, width, height);
          if (qr) {
            window.clearInterval(timer);
            onScan(qr.data);
          }
        }, SCAN_INTERVAL_MS);
      } catch {
        stream?.getTracks().forEach((track) => track.stop());
        if (active) setStatus("unavailable");
      }
    }

    void start(video);
    return () => {
      active = false;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [onScan]);

  return (
    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg bg-mist">
      <video ref={preview} muted playsInline aria-label="QR check-in camera" className="absolute size-full object-contain" hidden={status !== "ready"} />
      {status !== "ready" && (
        <div role="status" className="space-y-2 p-3 text-center text-sm text-muted">
          <Icon name="qr-code" className="mx-auto size-8" />
          <p>{status === "opening" ? "Opening camera…" : "Camera unavailable. Enter the code below."}</p>
        </div>
      )}
    </div>
  );
}
