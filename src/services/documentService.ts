import { File } from "expo-file-system";
import { supabase } from "@/src/lib/supabase";
import type { User } from "@/src/services/userService";

export type DocType =
  | "identity_proof"
  | "driving_license"
  | "hygiene_certificate"
  | "medical_clearance"
  | "culinary_degree"
  | "food_safety_certificate"
  | "work_experience_proof";

export type DocStatus = "pending" | "verified" | "rejected";

export interface UserDocument {
  id: string;
  docType: DocType;
  fileName: string;
  status: DocStatus;
  rejectionReason: string | null;
  updatedAt: string;
}

// A file picked on the device, not uploaded yet
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
}

export const MAX_DOC_BYTES = 5 * 1024 * 1024;
export const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export const DOC_LABELS: Record<DocType, string> = {
  identity_proof: "Identity document",
  driving_license: "Driving licence",
  hygiene_certificate: "Hygiene certification",
  medical_clearance: "Medical clearance certificate",
  culinary_degree: "Culinary degree",
  food_safety_certificate: "Food safety certificate",
  work_experience_proof: "Work experience proof",
};

// Required documents per worker role
export const REQUIRED_DOCS: Record<NonNullable<Exclude<User["role"], "admin">>, DocType[]> = {
  driver: ["identity_proof", "driving_license"],
  steward: ["identity_proof", "hygiene_certificate", "medical_clearance"],
  chef: ["identity_proof", "culinary_degree", "food_safety_certificate", "work_experience_proof"],
};

// Returns an error message, or null when the file can be uploaded
export function checkPickedFile(file: PickedFile): string | null {
  if (!ALLOWED_DOC_TYPES.includes(file.mimeType)) return "Use a PDF, JPG or PNG file.";
  if (file.size > MAX_DOC_BYTES) return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`;
  return null;
}

export async function fetchMyDocuments(userId: string): Promise<UserDocument[]> {
  const { data, error } = await supabase
    .from("user_documents")
    .select("id, doc_type, file_name, status, rejection_reason, updated_at")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((d: any) => ({
    id: d.id,
    docType: d.doc_type,
    fileName: d.file_name,
    status: d.status,
    rejectionReason: d.rejection_reason,
    updatedAt: d.updated_at,
  }));
}

// Uploads the file to the private bucket, then records it as pending (replacing any earlier upload of this type)
export async function submitDocument(userId: string, docType: DocType, file: PickedFile): Promise<void> {
  const problem = checkPickedFile(file);
  if (problem) throw new Error(problem);

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${docType}-${Date.now()}.${ext}`;
  const bytes = await new File(file.uri).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("user-documents")
    .upload(path, bytes, { contentType: file.mimeType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: previous } = await supabase
    .from("user_documents")
    .select("file_path")
    .eq("user_id", userId)
    .eq("doc_type", docType)
    .maybeSingle();

  const { error: rowError } = await supabase.from("user_documents").upsert(
    {
      user_id: userId,
      doc_type: docType,
      file_path: path,
      file_name: file.name,
      mime_type: file.mimeType,
      size_bytes: file.size,
      status: "pending",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,doc_type" }
  );
  if (rowError) {
    await supabase.storage.from("user-documents").remove([path]); // don't leave an orphaned file
    throw rowError;
  }
  // Best effort: the old file is no longer referenced
  if (previous?.file_path) await supabase.storage.from("user-documents").remove([previous.file_path]);
}

// Puts the account back in the admin's pending queue (e.g. after a rejection)
export async function requestVerification(userId: string): Promise<void> {
  const { error } = await supabase.from("users").update({ verification_status: "pending" }).eq("id", userId);
  if (error) throw error;
}

export type VerificationSummary = "verified" | "not_submitted" | "incomplete" | "rejected" | "pending";

// Overall state shown on the Profile tab, derived from the account flag and the documents on file
export function summarizeVerification(required: DocType[], docs: UserDocument[], isVerified: boolean): VerificationSummary {
  if (isVerified) return "verified";
  const byType = new Map(docs.map((d) => [d.docType, d]));
  if (docs.length === 0) return "not_submitted";
  if (required.some((t) => byType.get(t)?.status === "rejected")) return "rejected";
  if (required.some((t) => !byType.has(t))) return "incomplete";
  return "pending";
}
