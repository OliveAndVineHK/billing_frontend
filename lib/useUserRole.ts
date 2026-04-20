"use client";

import { useEffect, useState } from "react";
import { getAuth, getRoleFromToken } from "./auth";

const ALL_BILL_ROLES = new Set(["cashier", "shop_manager", "accountant", "admin", "super_admin"]);
const ELEVATED_ROLES = new Set(["accountant", "admin", "super_admin"]);

/** Decodes the `system_role` claim from the billing JWT. Returns empty string on failure. */
function getSystemRoleFromToken(): string {
  try {
    const auth = getAuth();
    if (!auth?.token) return "";
    const parts = auth.token.split(".");
    if (parts.length !== 3) return "";
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    return typeof payload.system_role === "string" ? payload.system_role : "";
  } catch {
    return "";
  }
}

export type UserRoleInfo = {
  role: string | null;
  /** accountant, admin, or super_admin */
  isElevated: boolean;
  /** any of the five defined bill roles */
  hasAnyRole: boolean;
  /**
   * True when the user is a system superuser (system_role='superuser').
   * These users have strict view-only access: all write actions must be
   * disabled in the UI and will be rejected by the API.
   */
  isViewOnly: boolean;
};

/**
 * Reads the `role` and `system_role` claims from the billing JWT on mount
 * and exposes derived permission flags. Safe to call in any client component —
 * returns neutral defaults (`null`, `false`, `false`, `false`) until the JWT
 * is available.
 */
export function useUserRole(): UserRoleInfo {
  const [role, setRole] = useState<string | null>(null);
  const [systemRole, setSystemRole] = useState<string>("");

  useEffect(() => {
    setRole(getRoleFromToken());
    setSystemRole(getSystemRoleFromToken());
  }, []);

  const normalized = (role ?? "").trim().toLowerCase().replace(/ /g, "_").replace(/-/g, "_");
  const normalizedSystemRole = systemRole.trim().toLowerCase();
  // A system superuser is identified by system_role='superuser' in the JWT.
  const isViewOnly = normalizedSystemRole === "superuser";
  return {
    role,
    isElevated: ELEVATED_ROLES.has(normalized) && !isViewOnly,
    hasAnyRole: ALL_BILL_ROLES.has(normalized),
    isViewOnly,
  };
}
