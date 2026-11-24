import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { ALL_DOCUMENTS, DOCUMENT_BUCKET, FILE_LIMITS, documentByteLimit } from "@/lib/registration/options";
import { DocumentUploadError, ServiceError, type DocumentUploads } from "./service";

const fileNameSchema = z.string().min(1).max(255);
const keys = ALL_DOCUMENTS.map(({ key }) => key);
const pathSchema = z.string().regex(/^staged\/[0-9a-f-]{36}\/[a-z_]+$/);

export async function signDocumentUpload(raw: unknown) {
  const parsed = z.object({
    key: z.enum(keys),
    type: z.enum(FILE_LIMITS.documentTypes),
    size: z.number().int().positive().max(FILE_LIMITS.documentBytes),
  }).safeParse(raw);
  if (!parsed.success) throw new ServiceError(`Choose a PDF, JPG or PNG file up to ${FILE_LIMITS.documentBytes / (1024 * 1024)} MB.`);

  const limit = documentByteLimit(parsed.data.key);
  if (parsed.data.size > limit) throw new ServiceError(`Choose a file up to ${limit / (1024 * 1024)} MB.`);
  const path = `staged/${randomUUID()}/${parsed.data.key}`;
  const { data, error } = await createAdminClient().storage.from(DOCUMENT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new ServiceError("Could not start the upload. Please retry.", 503);
  return { path, url: data.signedUrl };
}

export async function loadStagedDocuments(raw: FormDataEntryValue | null) {
  let manifest: unknown;
  try {
    manifest = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    throw new ServiceError("Invalid verification upload details.");
  }
  const parsed = z.record(z.enum(keys), z.object({ path: pathSchema, name: fileNameSchema })).safeParse(manifest);
  if (!parsed.success) throw new ServiceError("Upload all required verification documents.");

  const bucket = createAdminClient().storage.from(DOCUMENT_BUCKET);
  const documents: DocumentUploads = {};
  const paths: string[] = [];

  for (const { key, title } of ALL_DOCUMENTS) {
    const { path, name } = parsed.data[key];
    if (!path.endsWith(`/${key}`)) throw new ServiceError(`Invalid upload for ${title}.`);
    const { data, error } = await bucket.download(path);
    if (error || !data) throw new DocumentUploadError(key, `Upload ${title} again.`);
    documents[key] = new File([data], name, { type: data.type });
    paths.push(path);
  }

  return {
    documents,
    async cleanup() {
      try {
        const { error } = await bucket.remove(paths);
        if (error) console.error("Could not remove staged application documents", error.message);
      } catch (error) {
        console.error("Could not remove staged application documents", error);
      }
    },
  };
}
