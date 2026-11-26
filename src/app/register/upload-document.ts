import type { DocumentKey } from "@/lib/registration/options";

export async function uploadDocument(key: DocumentKey, file: File): Promise<{ path: string; name: string }> {
  const response = await fetch("/api/applications/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, type: file.type, size: file.size }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not start upload.");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", result.url);
    xhr.timeout = 120_000;
    const fail = () => reject(new Error("Upload failed. Please retry."));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : fail();
    xhr.onerror = fail;
    xhr.ontimeout = fail;
    xhr.onabort = fail;
    const body = new FormData();
    body.append("cacheControl", "0");
    body.append("", file);
    xhr.send(body);
  });

  return { path: result.path as string, name: file.name };
}
