"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type CountryItem = { country: string; shortName: string; zone: number; iossCode: string };

export default function KurasiAuthPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCountries().then((ok) => setIsLoggedIn(ok));
  }, []);

  async function login() {
    setLoginError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/kurasi/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = await res.json();
      if (!res.ok || j.status !== "SUCCESS") {
        setIsLoggedIn(false);
        setLoginError(j?.errorMessage || `Login failed (HTTP ${res.status})`);
      } else {
        const ok = await loadCountries();
        setIsLoggedIn(ok);
      }
    } catch (e: any) {
      setIsLoggedIn(false);
      setLoginError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/kurasi/logout", { method: "POST" });
      setIsLoggedIn(false);
      setCountries([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCountries(): Promise<boolean> {
    try {
      const res = await fetch("/api/kurasi/countries", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || j.status !== "SUCCESS") return false;
      setCountries(j.data || []);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Kurasi Authentication</h1>
        <p className="text-gray-600 dark:text-gray-400">Sign in to Kurasi once. Quote calculator will use your session globally.</p>
      </div>

      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Login</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
            <input className="input" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700 dark:text-gray-300">Password</span>
            <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-primary" onClick={login} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          <button className="btn" onClick={logout} disabled={!isLoggedIn || loading}>
            Logout
          </button>
          <button className="btn" onClick={loadCountries} disabled={!isLoggedIn || loading}>
            Reload Countries
          </button>
        </div>
        {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
        <p className="text-sm">{isLoggedIn ? "Logged in ✓ (token saved in cookie)" : "Not logged in"}</p>
      </section>

      <section className="card p-4 space-y-2">
        <h2 className="font-semibold">Session Info</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Destinations fetched: {countries.length > 0 ? countries.length : 0}
        </p>
        <div className="flex gap-2">
          <Link href="/quote" className="btn">Open Shipping Quote Calculator</Link>
          <Link href="/orders" className="btn">Go to Orders</Link>
        </div>
      </section>
    </div>
  );
}