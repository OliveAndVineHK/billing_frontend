"use client";

import { useEffect, useRef, useState } from "react";

const COLUMN_TITLES = [
  "Contact / Description",
  "Invoice Date",
  "Status",
  "Submitted Date",
  "Unpaid Amount",
  "Payment",
  "Paid Date",
  "Bankslip",
] as const;

export type PaymentRequestColumnTitle = (typeof COLUMN_TITLES)[number];

export type PaymentRequestRow = {
  id: string;
  contactTitle: string;
  contactCaption: string;
  invoiceDate: string;
  status: string;
  submittedDate: string;
  unpaidAmount: string;
  payment: string;
  paidDate: string;
  bankslip: string;
};

const DEMO_ROWS: PaymentRequestRow[] = [
  {
    id: "1",
    contactTitle: "Young Bros Transport",
    contactCaption: "Lorem ipsum dolor sit amet",
    invoiceDate: "03 Mar 2026",
    status: "Draft",
    submittedDate: "01 Mar 2026",
    unpaidAmount: "",
    payment: "",
    paidDate: "",
    bankslip: "",
  },
];

const HEADER_CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 rounded border border-primary/40";

const dataCellBase = "border-b border-gray-100 px-4 py-3 text-sm text-primary sm:px-5 sm:py-3.5";
const dataCellClass = `${dataCellBase} align-top`;
const contactCellClass = `${dataCellBase} align-middle`;
const invoiceDateCellClass = `${dataCellBase} align-middle`;

const statusTagClass =
  "inline-flex items-center rounded-lg bg-[#EDEDED] px-2.5 py-1 text-xs font-semibold text-[#C0C0C0] sm:text-sm";

type PaymentRequestTableProps = {
  rows?: PaymentRequestRow[];
};

export function PaymentRequestTable({ rows = DEMO_ROWS }: PaymentRequestTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const allSelected = rows.length > 0 && selectedIds.size === rows.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(rows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full min-w-0 px-4 pb-6 sm:px-6">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-[75rem] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th scope="col" className="w-12 min-w-[2.75rem] px-2 py-3 text-center sm:px-3 sm:py-3.5">
                  <input ref={headerCheckboxRef} type="checkbox" checked={allSelected} onChange={toggleAll} className={HEADER_CHECKBOX_CLASS} aria-label="Select all rows" suppressHydrationWarning />
                </th>
                {COLUMN_TITLES.map((title, index) => (
                  <th key={title} scope="col" className={`px-4 py-3 text-xs font-semibold text-primary sm:px-5 sm:py-3.5 sm:text-sm ${index === 0 ? "min-w-[14rem]" : "min-w-[7rem] whitespace-nowrap"}`}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3">
                    <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} className={HEADER_CHECKBOX_CLASS} aria-label={`Select row ${row.contactTitle}`} />
                  </td>
                  <td className={contactCellClass}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-primary sm:text-base">{row.contactTitle}</span>
                      {row.contactCaption ? (
                        <span className="text-xs text-primary/65 sm:text-sm">{row.contactCaption}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className={invoiceDateCellClass}>{row.invoiceDate}</td>
                  <td className={invoiceDateCellClass}>
                    {row.status ? <span className={statusTagClass}>{row.status}</span> : null}
                  </td>
                  <td className={invoiceDateCellClass}>{row.submittedDate}</td>
                  <td className={dataCellClass}>{row.unpaidAmount}</td>
                  <td className={dataCellClass}>{row.payment}</td>
                  <td className={dataCellClass}>{row.paidDate}</td>
                  <td className={dataCellClass}>{row.bankslip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { COLUMN_TITLES };
