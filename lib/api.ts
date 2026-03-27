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
    throw new ApiError(res.status, body.detail ?? body.message ?? res.statusText);
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

export type BillCreatePayload = {
  contact?: string;
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
  return apiFetch<BillDetail>("/bills/submit", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveBillDraft(payload: Partial<BillCreatePayload>): Promise<BillDetail> {
  return apiFetch<BillDetail>("/bills/draft", {
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

// ── Config ───────────────────────────────────────────────────────────

export function fetchEntityBillAccounts(): Promise<EntityBillAccount[]> {
  return apiFetch("/entity-bill-accounts/");
}

export function fetchCurrencies(): Promise<CurrencyInfo[]> {
  return apiFetch("/currencies/");
}
