import { getAuth } from "./auth";

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

export function fetchEntityBillAccounts(): Promise<EntityBillAccount[]> {
  return apiFetch("/entity-bill-accounts/");
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
