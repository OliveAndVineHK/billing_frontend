"use client";

import { useState } from "react";

const COLUMN_TITLES = [
  "Contact Description",
  "Invoice Date",
  "Status",
  "Submitted Date",
  "Unpaid Amount",
  "Payment",
  "Paid Date",
  "Bankslip",
] as const;

export type PaymentRequestColumnTitle = (typeof COLUMN_TITLES)[number];

const HEADER_CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 rounded border border-primary/40";

export function PaymentRequestTable() {
  const [selectAll, setSelectAll] = useState(false);

  return (
    <div className="w-full min-w-0 px-4 pb-6 sm:px-6">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-[75rem] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th scope="col" className="w-12 min-w-[2.75rem] px-2 py-3 text-center sm:px-3 sm:py-3.5">
                  <input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} className={HEADER_CHECKBOX_CLASS} aria-label="Select all rows" />
                </th>
                {COLUMN_TITLES.map((title, index) => (
                  <th
                    key={title}
                    scope="col"
                    className={`px-4 py-3 text-xs font-semibold text-primary sm:px-5 sm:py-3.5 sm:text-sm ${index === 0 ? "min-w-[14rem]" : "min-w-[7rem] whitespace-nowrap"}`}
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              <tr>
                <td className="border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3">
                  <input type="checkbox" checked={selectAll} onChange={(e) => setSelectAll(e.target.checked)} className={HEADER_CHECKBOX_CLASS} aria-label="Select row" />
                </td>
                <td colSpan={COLUMN_TITLES.length} className="h-12 border-b border-gray-100" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export { COLUMN_TITLES };
