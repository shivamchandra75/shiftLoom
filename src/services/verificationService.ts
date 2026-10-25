import { supabase } from "@/src/lib/supabase";
import type { DocStatus, DocType } from "@/src/services/documentService";

export type VerificationStatus = "pending" | "verified" | "rejected";

export interface QueueWorker {
  id: string;
  name: string;
  email: string;
  role: "driver" | "steward" | "chef";
  status: VerificationStatus;
  docCount: number;
  pendingCount: number;
  lastSubmittedAt: string;
}

export interface ReviewDocument {
  id: string;
  docType: DocType;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  status: DocStatus;
  rejectionReason: string | null;
  updatedAt: string;
}

export interface ReviewWorker {
  id: string;
  name: string;
  email: string;
  role: QueueWorker["role"];
  status: VerificationStatus;
  documents: ReviewDocument[];
}

const fullName = (u: any) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "Unnamed worker";

// Workers with at least one uploaded document, in the given verification state
export async function fetchVerificationQueue(status: VerificationStatus): Promise<QueueWorker[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, first_name, last_name, email, role, verification_status, user_documents!inner(status, updated_at)")
    .eq("verification_status", status)
    .neq("role", "admin");

  if (error) throw error;
  return (data ?? []).map((u: any) => {
    const docs: { status: DocStatus; updated_at: string }[] = u.user_documents;
    return {
      id: u.id,
      name: fullName(u),
      email: u.email ?? "",
      role: u.role,
      status: u.verification_status,
      docCount: docs.length,
      pendingCount: docs.filter((d) => d.status === "pending").length,
      lastSubmittedAt: docs.reduce((max, d) => (d.updated_at > max ? d.updated_at : max), ""),
    };
  });
}

export async function fetchWorkerForReview(userId: string): Promise<ReviewWorker> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, first_name, last_name, email, role, verification_status, user_documents(id, doc_type, file_name, file_path, mime_type, size_bytes, status, rejection_reason, updated_at)"
    )
    .eq("id", userId)
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: fullName(data),
    email: data.email ?? "",
    role: data.role,
    status: data.verification_status,
    documents: (data.user_documents ?? []).map((d: any) => ({
      id: d.id,
      docType: d.doc_type,
      fileName: d.file_name,
      filePath: d.file_path,
      mimeType: d.mime_type,
      sizeBytes: d.size_bytes,
      status: d.status,
      rejectionReason: d.rejection_reason,
      updatedAt: d.updated_at,
    })),
  };
}

// Short-lived link to a private document file (10 minutes)
export async function getDocumentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(filePath, 600);
  if (error) throw error;
  return data.signedUrl;
}

// Approve or reject documents in one transaction; returns the worker's new verification status
export async function reviewDocuments(documentIds: string[], status: "verified" | "rejected", reason?: string): Promise<VerificationStatus> {
  const { data, error } = await supabase.rpc("review_documents", {
    p_document_ids: documentIds,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  return data as VerificationStatus;
}
