/** Server-side error log. One line of JSON, with email addresses and long numbers removed. */
export function redact(text: string): string {
  return text.replace(/[^\s@"'<>()]+@[^\s@"'<>()]+\.[a-z]{2,}/gi, "[email]").replace(/\+?\d[\d -]{8,}\d/g, "[number]");
}

export function logError(event: string, error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error;
  const message = redact(error instanceof Error ? error.message : String(error));
  console.error(JSON.stringify({ level: "error", event, name, message }));
}
