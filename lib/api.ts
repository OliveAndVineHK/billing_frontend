import { getAuth, isTokenExpiringSoon, redirectToLogin } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_MODULE2_BACKEND_URL ?? "http://localhost:8000";

// ── Error ────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 422 from billing API when `reference` duplicates another bill in the entity. */
export function isDuplicateBillReferenceError(err: unknown): err is ApiError {
  return (
    err instanceof ApiError &&
    err.status === 422 &&
    /invoice number already exists/i.test(err.message)
  );
}

function normalizeApiErrorDetail(detail: unknown, fallback: string): string {
  if (detail == null || detail === "") return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join("; ");
  }
  return String(detail);
}

// ── Core fetch wrapper ───────────────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (isTokenExpiringSoon()) {
    redirectToLogin();
    throw new ApiError(401, "Session expiring soon. Redirecting to login.");
  }

  const auth = getAuth();
  if (!auth?.token) throw new ApiError(401, "Not authenticated");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${auth.token}`);
  headers.set("X-Entity-Id", auth.entityId);

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}/api/v1${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Session expired. Redirecting to login.");
    }
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    const msg = normalizeApiErrorDetail(
      body.detail ?? body.message,
      res.statusText,
    );
    throw new ApiError(res.status, msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

function resolveBackendFileUrl(url: string): string {
  const base = API_BASE.replace(/\/$/, "");
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/api/v1")) return `${base}${url}`;
  if (url.startsWith("/")) return `${base}/api/v1${url}`;
  return `${base}/api/v1/${url}`;
}

function getApiOrigin(): string {
  try {
    return new URL(API_BASE.replace(/\/$/, "")).origin;
  } catch {
    return "";
  }
}

function isCrossOriginStoragePreviewUrl(absolute: string): boolean {
  if (!absolute.startsWith("http://") && !absolute.startsWith("https://")) return false;
  const api = getApiOrigin();
  if (!api) return true;
  try {
    return new URL(absolute).origin !== api;
  } catch {
    return false;
  }
}

function extractFileUrlFromAttachmentJson(data: Record<string, unknown>): string | undefined {
  const nested = data.attachment as Record<string, unknown> | undefined;
  const from = (o: Record<string, unknown>): string | undefined => {
    const pick = (v: unknown): string | undefined => {
      if (typeof v !== "string") return undefined;
      const s = v.trim();
      return s.length > 0 ? s : undefined;
    };
    return (
      pick(o.download_url) ??
      pick(o.file_url) ??
      pick(o.url) ??
      pick(o.signed_url) ??
      pick(o.presigned_url) ??
      pick(o.public_url)
    );
  };
  return from(data) ?? (nested ? from(nested) : undefined);
}

function parseAttachmentFileSizeBytes(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return Math.round(raw);
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw.trim());
    if (Number.isFinite(n) && n >= 0) return Math.round(n);
  }
  return undefined;
}

async function fetchAttachmentDownloadJson(path: string): Promise<{
  url: string;
  mime_type?: string;
  file_size?: number;
} | null> {
  const auth = getAuth();
  if (!auth?.token) throw new ApiError(401, "Not authenticated");

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${auth.token}`);
  headers.set("X-Entity-Id", auth.entityId);
  headers.set("Accept", "application/json");

  const res = await fetch(`${API_BASE}/api/v1${path}`, { headers });

  if (!res.ok) {
    if (res.status === 401) {
      redirectToLogin();
      throw new ApiError(401, "Session expired. Redirecting to login.");
    }
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  const url = extractFileUrlFromAttachmentJson(data);
  if (!url) return null;

  const mimeRaw = data.mime_type;
  const mime_type =
    typeof mimeRaw === "string" && mimeRaw.trim() ? mimeRaw.trim() : undefined;

  const nestedAtt = data.attachment as Record<string, unknown> | undefined;
  const file_size =
    parseAttachmentFileSizeBytes(data.file_size) ??
    (nestedAtt ? parseAttachmentFileSizeBytes(nestedAtt.file_size) : undefined);

  return { url, mime_type, file_size };
}

async function fetchBytesFromResolvedFileUrl(absolute: string): Promise<Blob | null> {
  const auth = getAuth();
  const apiOrigin = getApiOrigin();
  let targetOrigin: string;
  try {
    targetOrigin = new URL(absolute).origin;
  } catch {
    return null;
  }

  const authHeaders = (): Headers => {
    const h = new Headers();
    h.set("Accept", "*/*");
    if (auth?.token) {
      h.set("Authorization", `Bearer ${auth.token}`);
      h.set("X-Entity-Id", auth.entityId);
    }
    return h;
  };

  if (targetOrigin === apiOrigin && apiOrigin !== "") {
    const res = await fetch(absolute, { headers: authHeaders() });
    if (!res.ok) return null;
    const b = await res.blob();
    return b.size > 0 ? b : null;
  }

  /** Third-party storage: no Authorization (avoids CORS preflight / breaks presigned URLs). */
  const res = await fetch(absolute, { credentials: "omit" });
  if (!res.ok) return null;
  const b = await res.blob();
  return b.size > 0 ? b : null;
}

/**
 * Ordered `/download` candidates for preview (see `fetchAttachmentDownloadJson`).
 * Tries payment-attachment id on the payment route first, then bill file id on the bill route.
 */
function buildPaymentAttachmentDownloadPaths(
  billId: string,
  paymentId: string,
  paymentAttachmentId: string,
  storageAttachmentId?: string,
): string[] {
  const payBase = `/bills/${billId}/payments/${paymentId}/attachments`;
  const billAttBase = `/bills/${billId}/attachments`;
  const nested = storageAttachmentId?.trim();
  const ordered: string[] = [`${payBase}/${paymentAttachmentId}/download`];
  if (nested && nested !== paymentAttachmentId) {
    ordered.push(`${billAttBase}/${nested}/download`);
  }
  ordered.push(`${billAttBase}/${paymentAttachmentId}/download`);
  if (nested && nested !== paymentAttachmentId) {
    ordered.push(`${payBase}/${nested}/download`);
  }
  const seen = new Set<string>();
  return ordered.filter((p) => (seen.has(p) ? false : !!seen.add(p)));
}

type PaymentAttachmentPreview =
  | { kind: "embed"; url: string; mime_type?: string; file_size?: number }
  | { kind: "blob"; blob: Blob; file_size?: number };

export async function fetchPaymentAttachmentPreview(
  billId: string,
  paymentId: string,
  paymentAttachmentId: string,
  storageAttachmentId?: string,
): Promise<PaymentAttachmentPreview> {
  let lastError: unknown;

  const downloadPaths = buildPaymentAttachmentDownloadPaths(
    billId,
    paymentId,
    paymentAttachmentId,
    storageAttachmentId,
  );

  for (const path of downloadPaths) {
    try {
      const meta = await fetchAttachmentDownloadJson(path);
      if (!meta) continue;
      const absolute = resolveBackendFileUrl(meta.url);
      if (isCrossOriginStoragePreviewUrl(absolute)) {
        return {
          kind: "embed",
          url: absolute,
          mime_type: meta.mime_type,
          file_size: meta.file_size,
        };
      }
      const bytes = await fetchBytesFromResolvedFileUrl(absolute);
      if (!bytes || bytes.size === 0) {
        lastError = new ApiError(404, "Empty file from storage URL");
        continue;
      }
      const t = (bytes.type || "").toLowerCase();
      const file_size = meta.file_size ?? bytes.size;
      if (meta.mime_type && (!t || t === "application/octet-stream")) {
        return {
          kind: "blob",
          blob: new Blob([await bytes.arrayBuffer()], { type: meta.mime_type }),
          file_size,
        };
      }
      return { kind: "blob", blob: bytes, file_size };
    } catch (e) {
      lastError = e;
      if (e instanceof ApiError && e.status === 401) throw e;
      continue;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new ApiError(404, "Could not download attachment");
}

// ── Types ────────────────────────────────────────────────────────────

export type BillListItem = {
  id: string;
  entity_id: string;
  contact: string;
  status: string;
  amount: string;
  amount_due: string;
  description: string;
  due_date: string | null;
  invoice_date: string | null;
  reference: string;
  currency_code: string;
  xero_account_code: string;
  published: string;
  created_at: string;
  uploaded_by: string;
};

export type BillDetail = BillListItem & {
  xero_contact_id: string;
  updated_at: string;
  attachments: BillAttachment[];
  line_items: LineItem[];
};

export type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unit_amount: string;
  line_amount: string;
  account_code: string;
  account_name: string;
  tax_type: string;
  sort_order: number;
  note: string;
  created_at: string;
  updated_at: string;
};

export type Attachment = {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  storage_provider: string;
  created_at: string;
};

export type BillAttachment = {
  id: string;
  attachment: Attachment;
  attachment_role: string;
  sort_order: number;
  note: string;
  created_at: string;
};

/** Payment attachment row (bank slip, etc.) — same shape as bill attachment in API responses. */
export type PaymentAttachment = BillAttachment;

export type BillCreatePayload = {
  contact?: string;
  xero_contact_id?: string;
  description?: string;
  amount?: number;
  due_date?: string | null;
  invoice_date?: string | null;
  reference?: string;
  currency_code?: string;
  xero_account_code?: string;
  line_items?: {
    description?: string;
    quantity?: number;
    unit_amount?: number;
    line_amount?: number;
    account_code?: string;
    account_name?: string;
  }[];
};

export type EntityBillAccount = {
  id: string;
  entity_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
};

export type CurrencyInfo = {
  id: string;
  currency_code: string;
  currency_name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
};

// ── Bills ────────────────────────────────────────────────────────────

export function fetchBills(params?: {
  status?: string;
  contact?: string;
  sort_by?: string;
  page?: number;
  page_size?: number;
}): Promise<BillListItem[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.contact) qs.set("contact", params.contact);
  if (params?.sort_by) qs.set("sort_by", params.sort_by);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  const q = qs.toString();
  return apiFetch<BillListItem[]>(`/bills/${q ? `?${q}` : ""}`);
}

export function fetchBill(billId: string): Promise<BillDetail> {
  return apiFetch<BillDetail>(`/bills/${billId}`);
}

export function createBill(payload: BillCreatePayload): Promise<BillDetail> {
  return apiFetch<BillDetail>("/bills/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitBill(payload: BillCreatePayload): Promise<BillDetail> {
  return apiFetch<BillDetail>("/bills/submit/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveBillDraft(payload: Partial<BillCreatePayload>): Promise<BillDetail> {
  return apiFetch<BillDetail>("/bills/draft/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBill(
  billId: string,
  payload: Partial<BillCreatePayload> & { status?: string },
): Promise<BillDetail> {
  return apiFetch<BillDetail>(`/bills/${billId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteBill(billId: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/bills/${billId}`, {
    method: "DELETE",
  });
}

/** Publish a bill to Xero (single bill). */
export function publishBill(billId: string): Promise<BillDetail> {
  return apiFetch<BillDetail>(`/bills/${billId}/publish/`, {
    method: "POST",
  });
}

// ── Attachments ──────────────────────────────────────────────────────

export function uploadBillAttachment(billId: string, file: File): Promise<BillAttachment> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<BillAttachment>(`/bills/${billId}/attachments`, {
    method: "POST",
    body: form,
  });
}

// ── Payments ─────────────────────────────────────────────────────

export type PaymentItem = {
  id: string;
  bill_id: string;
  /** Invoice-style ref for the bill paid; list responses may include it. */
  bill_reference?: string;
  /** Status of the bill that owns this payment — used for per-row delete eligibility. */
  bill_status?: string;
  payment_date: string | null;
  amount: string;
  currency_code: string;
  payment_method: string;
  payment_status: string;
  reference_no: string;
  note: string;
  xero_payment_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PaymentListResponse = {
  paid_total: string;
  payments: PaymentItem[];
};

export type PaymentCreatePayload = {
  payment_date?: string | null;
  amount?: number;
  currency_code?: string;
  payment_method?: string;
  payment_status?: string;
  reference_no?: string;
  note?: string;
};

export function fetchPayments(billId: string): Promise<PaymentListResponse> {
  return apiFetch(`/bills/${billId}/payments`);
}

export function createPayment(
  billId: string,
  payload: PaymentCreatePayload,
): Promise<PaymentItem> {
  return apiFetch(`/bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePayment(
  billId: string,
  paymentId: string,
  payload: Partial<PaymentCreatePayload>,
): Promise<PaymentItem> {
  return apiFetch(`/bills/${billId}/payments/${paymentId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePayment(
  billId: string,
  paymentId: string,
): Promise<{ message: string }> {
  return apiFetch(`/bills/${billId}/payments/${paymentId}`, {
    method: "DELETE",
  });
}

export function listPaymentAttachments(
  billId: string,
  paymentId: string,
): Promise<PaymentAttachment[]> {
  return apiFetch(`/bills/${billId}/payments/${paymentId}/attachments`);
}

export function deletePaymentAttachment(
  billId: string,
  paymentId: string,
  paymentAttachmentId: string,
): Promise<{ message: string } | undefined> {
  return apiFetch(`/bills/${billId}/payments/${paymentId}/attachments/${paymentAttachmentId}`, {
    method: "DELETE",
  });
}

/** Upload a file for a payment (e.g. bank slip). Multipart field `file`; `attachment_role` query defaults to bank_slip. */
export function uploadPaymentAttachment(
  billId: string,
  paymentId: string,
  file: File,
  attachmentRole: string = "bank_slip",
): Promise<PaymentAttachment> {
  const form = new FormData();
  form.append("file", file);
  const qs = new URLSearchParams();
  qs.set("attachment_role", attachmentRole);
  return apiFetch<PaymentAttachment>(
    `/bills/${billId}/payments/${paymentId}/attachments?${qs.toString()}`,
    { method: "POST", body: form },
  );
}

// ── Audit ─────────────────────────────────────────────────────────

export type AuditItem = {
  id: string;
  bill_id: string;
  action: string;
  detail: string;
  date: string;
  user_id: string;
  user_name: string;
  user_email: string;
};

export function fetchAuditHistory(billId: string): Promise<AuditItem[]> {
  return apiFetch(`/bills/${billId}/audit`);
}

// ── Config ───────────────────────────────────────────────────────────

/** Pass forceChartSync on Settings so Xero vs DB reconcile runs even if another list ran recently (bypasses server debounce). */
export function fetchEntityBillAccounts(options?: {
  forceChartSync?: boolean;
}): Promise<EntityBillAccount[]> {
  const qs = options?.forceChartSync ? "?force_chart_sync=true" : "";
  return apiFetch(`/entity-bill-accounts/${qs}`);
}

export function updateEntityBillAccount(
  accountId: string,
  payload: Partial<Pick<EntityBillAccount, "is_active" | "is_default" | "sort_order">>,
): Promise<EntityBillAccount> {
  return apiFetch(`/entity-bill-accounts/${accountId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export type EntityBillContact = {
  id: string;
  entity_id: string;
  xero_contact_id: string;
  xero_org_id: string | null;
  name: string;
  category: string | null;
};

export function fetchEntityBillContacts(): Promise<EntityBillContact[]> {
  return apiFetch("/entity-bill-contacts/");
}

export function fetchCurrencies(): Promise<CurrencyInfo[]> {
  return apiFetch("/currencies/");
}
