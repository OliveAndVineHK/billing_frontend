"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchBill } from "@/lib/api";
import { billStatusToDisplayLabel, statusDisplayBadgeClass } from "@/lib/billStatusDisplay";

export function PaymentRequestDetailStatusBadge() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchBill(id)
      .then((bill) => {
        if (!cancelled) setLabel(billStatusToDisplayLabel(bill.status));
      })
      .catch(() => {
        if (!cancelled) setLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!label) return null;

  return <span className={statusDisplayBadgeClass(label)}>{label}</span>;
}
