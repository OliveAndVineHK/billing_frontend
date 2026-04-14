"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchAuthMe, type AuthMeUser } from "@/lib/api";

export type MyProfileContentProps = {
  onLogOut: () => void;
};

function initialsFromNames(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const a = f.charAt(0);
  const b = l.charAt(0);
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  return "—";
}

function displayName(me: AuthMeUser | null): string {
  if (!me) return "—";
  const parts = [me.first_name, me.last_name].map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

export function MyProfileContent({ onLogOut }: MyProfileContentProps) {
  const [profile, setProfile] = useState<AuthMeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [updateHint, setUpdateHint] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const me = await fetchAuthMe();
      setProfile(me);
    } catch (e) {
      setProfile(null);
      setError(e instanceof ApiError ? e.message : "Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshTick]);

  const handleUpdateProfile = () => {
    setRefreshTick((n) => n + 1);
    setUpdateHint(true);
    window.setTimeout(() => setUpdateHint(false), 2500);
  };

  const abbr = initialsFromNames(profile?.first_name, profile?.last_name);
  const emailRaw = (profile?.email ?? "").trim();
  const emailDisplay = loading ? "…" : emailRaw || "—";

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-8 pt-4 sm:px-6 sm:pt-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#FFE6B1] text-3xl font-semibold text-[#6B3A12] sm:h-28 sm:w-28 sm:text-[2rem]">
            {loading ? <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-primary/30" aria-hidden /> : abbr}
          </div>
          <button
            type="button"
            disabled
            aria-label="Edit profile (not available yet)"
            className="absolute -bottom-0.5 -right-0.5 flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-full border-0 bg-secondary text-white shadow-md ring-2 ring-white disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
              mode_edit
            </span>
          </button>
        </div>
        <h1 className="mt-5 text-xl font-bold text-black sm:text-2xl">{loading ? "…" : displayName(profile)}</h1>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col gap-4">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-[#54D3DA]" aria-hidden>
                <span className="material-symbols-outlined text-[22px] leading-none [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                  mail
                </span>
              </span>
              <span
                className="material-symbols-outlined shrink-0 text-[22px] leading-none text-secondary [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]"
                aria-hidden
              >
                verified
              </span>
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/60">Email address</p>
              <p className="mt-1 break-all text-base font-semibold text-black">{emailDisplay}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3">
            <div className="flex w-full items-center justify-between gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-[#54D3DA]" aria-hidden>
                <span className="material-symbols-outlined text-[22px] leading-none [font-variation-settings:'FILL'_1,'wght'_400,'GRAD'_0,'opsz'_24]">
                  account_circle
                </span>
              </span>
              <span
                className="shrink-0 cursor-not-allowed select-none text-sm font-semibold text-secondary"
                aria-disabled="true"
                title="Edit name (not available yet)"
              >
                Edit
              </span>
            </div>
            <div className="grid w-full grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/55">First name</p>
                <p className="mt-0.5 font-semibold text-black">{loading ? "…" : (profile?.first_name ?? "").trim() || "—"}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary/55">Last name</p>
                <p className="mt-0.5 font-semibold text-black">{loading ? "…" : (profile?.last_name ?? "").trim() || "—"}</p>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-sm text-primary/80">
          <a
            href="https://identity.xero.com/account"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer font-semibold text-secondary underline underline-offset-2 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Reset Password
          </a>
        </p>
      </div>

      {updateHint ? (
        <p className="mt-4 text-center text-sm text-primary/70" role="status">
          Profile refreshed from server.
        </p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          className="box-border flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-[#FF6B6B] bg-white text-sm font-semibold text-[#FF6B6B] transition-colors hover:bg-[#FF6B6B]/10"
          onClick={() => onLogOut()}
        >
          <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
            logout
          </span>
          Log out
        </button>
        <button
          type="button"
          onClick={handleUpdateProfile}
          disabled={loading}
          className="box-border flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-transparent bg-secondary text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Update profile
        </button>
      </div>
    </div>
  );
}
