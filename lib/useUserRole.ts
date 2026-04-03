"use client";

import { useEffect, useState } from "react";
import { getRoleFromToken } from "./auth";

const ALL_BILL_ROLES = new Set(["cashier", "shop_manager", "accountant", "admin", "super_admin"]);
const ELEVATED_ROLES = new Set(["accountant", "admin", "super_admin"]);

export type UserRoleInfo = {
  role: string | null;
  /** accountant, admin, or super_admin */
  isElevated: boolean;
  /** any of the five defined bill roles */
  hasAnyRole: boolean;
};

/**
 * Reads the `role` claim from the billing JWT on mount and exposes derived
 * permission flags. Safe to call in any client component — returns neutral
 * defaults (`null`, `false`, `false`) until the JWT is available.
 */
export function useUserRole(): UserRoleInfo {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRoleFromToken());
  }, []);

  const normalized = (role ?? "").trim().toLowerCase().replace(/ /g, "_");
  return {
    role,
    isElevated: ELEVATED_ROLES.has(normalized),
    hasAnyRole: ALL_BILL_ROLES.has(normalized),
  };
}
