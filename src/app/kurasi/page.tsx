// src/app/kurasi/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionResp = {
  status: "SUCCESS" | "FAIL" | "ERROR";
  loggedIn?: boolean;
  label?: string | null;
  tokenPreview?: string | null; // masked token, e.g. abcd…wxyz
  tokenLength?: number;         // total length
  errorMessage?: string;
};

type CountriesResp = {
  status: "SUCCESS" | "FAIL" | "ERROR";
  data?: Array<{ country: string; shortName: string; zone: number; iossCode: string }>;
  errorMessage?: string;
};

export default function KurasiAuthPage() {
  // form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // state
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [tokenPreview, setTokenPreview] = useState<string | null>(null);
  const [tokenLength, setTokenLength] = useState<number>(0);
  const [loginError, setLoginError] = useState<string | null>(null);

  // countries info
  const [countriesCount, setCountriesCount] = useState(0);
  const [countriesError, setCountriesError] = useState<string | null>(null);

  // load last used email for convenience
  useEffect(() => {
    const saved = localStorage.getItem("kurasi:lastEmail") || "";
    if (saved) setEmail(saved);
  }, []);
  useEffect(() => {
    if (email) localStorage.setItem("kurasi:lastEmail", email);
  }, [email]);

  // initial session check
  useEffect(() => {
    void checkSession(true);
  }, []);

  async function checkSession(initial = false) {
    setChecking(!initial);
    try {
      const res = await fetch("/api/kurasi/session?verify=1", { cache: "no-store" });
      const j: SessionResp = await res.json();
      if (res.ok && j.status === "SUCCESS" && j.loggedIn) {
        setIsLoggedIn(true);
        setLabel(j.label ?? null);
        setTokenPreview(j.tokenPreview ?? null);
        setTokenLength(j.tokenLength ?? 0);
        setLoginError(null);
      } else {
        setIsLoggedIn(false);
        setLabel(null);
        setTokenPreview(null);
        setTokenLength(0);
      }
    } catch {
      setIsLoggedIn(false);
      setLabel(null);
      setTokenPreview(null);
      setTokenLength(0);
    } finally {
      setChecking(false);
    }
  }

  async function login() {
    setBusy(true);
    setLoginError(null);
    try {
      const r = await fetch("/api/kurasi/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email.trim(), password }),
      });
      const j = await r.json();
      if (!r.ok || j?.status !== "SUCCESS") {
        setLoginError(j?.errorMessage || `Login failed (HTTP ${r.status})`);
        setIsLoggedIn(false);
      } else {
        await checkSession();
      }
    } catch (e: any) {
      setLoginError(e?.message || "Network error");
      setIsLoggedIn(false);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/kurasi/logout", { method: "POST" });
      setIsLoggedIn(false);
      setLabel(null);
      setTokenPreview(null);
      setTokenLength(0);
      setCountriesCount(0);
      setCountriesError(null);
    } finally {
      setBusy(false);
    }
  }

  async function reloadCountries() {
    setCountriesError(null);
    try {
      const r = await fetch("/api/kurasi/countries", { cache: "no-store" });
      const j: CountriesResp = await r.json();
      if (r.ok && j.status === "SUCCESS") {
        setCountriesCount(j.data?.length ?? 0);
      } else {
        setCountriesCount(0);
        setCountriesError(j?.errorMessage || "Failed to fetch destinations");
      }
    } catch {
      setCountriesCount(0);
      setCountriesError("Failed to fetch destinations");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kurasi Authentication</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Sign in once; the quote calculator and HS-Code validator reuse your session (HTTP-only cookie).
        </p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Login</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary" onClick={login} disabled={busy}>
            {busy ? "Logging in..." : "Login"}
          </button>
          <button className="btn" onClick={logout} disabled={!isLoggedIn || busy}>
            Logout
          </button>
          <button className="btn" onClick={() => checkSession()} disabled={checking || busy}>
            {checking ? "Checking…" : "Check Session"}
          </button>
          <button className="btn" onClick={reloadCountries} disabled={!isLoggedIn || busy}>
            Reload Countries
          </button>
        </div>

        {loginError && <p className="text-red-600 text-sm">{loginError}</p>}

        <div className="text-sm text-gray-700 dark:text-gray-300">
          {isLoggedIn ? (
            <>
              Logged in ✓ {label ? <>as <b>{label}</b></> : null}
              <br />
              Current <code>x-ship-auth-token</code> (masked):{" "}
              {tokenPreview ? tokenPreview : "—"}{" "}
              {tokenLength ? <>({tokenLength} chars)</> : null}
            </>
          ) : (
            <>Not logged in</>
          )}
        </div>
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="font-semibold">Session Info</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Destinations fetched: {countriesCount}
          {countriesError ? (
            <span className="text-red-600"> — {countriesError}</span>
          ) : null}
        </p>
        <div className="flex gap-2">
          <Link href="/quote" className="btn">
            Open Shipping Quote Calculator
          </Link>
          <Link href="/orders" className="btn">
            Go to Orders
          </Link>
        </div>
      </section>
    </div>
  );
}
