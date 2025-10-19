// src/components/NewOrderModal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./Modal";
import RecipientModal from "@/components/RecipientModal";
import CustomerModal from "@/components/CustomerModal";
import Combobox from "@/components/Combobox";

/* ───────────────── tiny debounce ───────────────── */
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ───────────── Async search select (light) ───────────── */
function AsyncSearchSelect({
  label,
  placeholder,
  value,
  onChange,
  fetcher,
  required = false,
  onCreateNew,
  createLabel = "Create new",
}: {
  label: string;
  placeholder: string;
  value: { id: string; label: string } | null;
  onChange: (v: { id: string; label: string } | null) => void;
  fetcher: (q: string) => Promise<{ id: string; label: string }[]>;
  required?: boolean;
  onCreateNew?: (query: string) => void;
  createLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQ = useDebounced(query, 250);
  const [items, setItems] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open) return;
      setLoading(true);
      try {
        const res = await fetcher(debouncedQ);
        if (!cancelled) setItems(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, open, fetcher]);

  return (
    <div className="relative">
      <label className="block text-sm mb-1">
        {label} {required ? "*" : ""}
      </label>
      <div
        className="input w-full cursor-text"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen(true)}
      >
        <input
          value={open ? query : value?.label ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none"
          required={required && !value}
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700">
          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
          ) : (
            <>
              {items.length > 0 ? (
                <ul role="listbox" className="py-1">
                  {items.map((it) => (
                    <li
                      key={it.id}
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(it);
                        setOpen(false);
                      }}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      {it.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
              )}

              {onCreateNew && query.trim().length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const q = query.trim();
                    setOpen(false);
                    onCreateNew(q);
                  }}
                  className="w-full text-left px-3 py-2 text-sm border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {createLabel} “{query.trim()}”
                </button>
              )}
            </>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}

/* ───────────────── helpers & types ───────────────── */
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-gray-700 dark:text-gray-300">
      <span className="shrink-0 text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

// Parse "Full Name — CC, City"
function parseRecipientSeed(input: string) {
  const parts = input.split("—");
  const buyerFullName = parts[0]?.trim() || "";
  let buyerCountry = "";
  let buyerCity = "";
  if (parts[1]) {
    const tail = parts[1].trim();
    const [cc, ...rest] = tail.split(",");
    buyerCountry = (cc || "").trim().slice(0, 2).toUpperCase();
    buyerCity = rest.join(",").trim();
  }
  return { buyerFullName, buyerCountry, buyerCity };
}

type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  phoneCode?: string | null;
  shopeeName?: string | null;
};

type BuyerDetail = {
  id: string;
  buyerFullName: string;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  buyerAddress1: string;
  buyerAddress2?: string | null;
  buyerCity: string;
  buyerState?: string | null;
  buyerZip: string;
  buyerCountry: string; // ISO-2
};

type KurasiOption = {
  code: "EP" | "ES" | "EX" | "PP";
  key: "epr" | "esr" | "err" | "ppr";
  title: string;
  amount: number;
  displayAmount: string;
  maxWeight: string | null;
};

/* ───────────────────────── component ───────────────────────── */
export default function NewOrderModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Create New Order",
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // selections
  const [customer, setCustomer] = useState<{ id: string; label: string } | null>(null);
  const [buyer, setBuyer] = useState<{ id: string; label: string } | null>(null);

  // details
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [buyerDetail, setBuyerDetail] = useState<BuyerDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<{ customer: boolean; buyer: boolean }>({
    customer: false,
    buyer: false,
  });

  // package
  const [weight, setWeight] = useState<string>(""); // required
  const [totalValue, setTotalValue] = useState<string>(""); // required
  const [valueCurrency, setValueCurrency] = useState<string>("USD"); // UI only
  const [service, setService] = useState<string>(""); // EP/ES/EX/PP
  const [packageDescription, setPackageDescription] = useState<string>(""); // required
  const [hsCode, setHsCode] = useState<string>(""); // 6 or 10
  const [hsError, setHsError] = useState<string | null>(null);

  // SRN (required + unique)
  const [srn, setSrn] = useState<string>("");
  const debouncedSrn = useDebounced(srn.trim(), 400);
  const [srnError, setSrnError] = useState<string | null>(null);

  // marketplace tax info
  const [saleChannel, setSaleChannel] = useState<"" | "Ebay" | "Etsy" | "Other">("");
  const [taxRef, setTaxRef] = useState<"" | "SST" | "VAT" | "GST" | "Other">("");
  const [taxNumber, setTaxNumber] = useState<string>("");

  // nested create
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createBuyerOpen, setCreateBuyerOpen] = useState(false);
  const [buyerSeed, setBuyerSeed] = useState<{ buyerFullName?: string; buyerCountry?: string; buyerCity?: string } | null>(null);

  // Kurasi quote
  const [services, setServices] = useState<KurasiOption[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesErr, setServicesErr] = useState<string | null>(null);
  const [quoteMeta, setQuoteMeta] = useState<{ currencyType?: string; currencySymbol?: string; chargeableWeight?: number; volumetricWeight?: number } | null>(null);

  /* reset on open */
  useEffect(() => {
    if (!isOpen) return;
    setErr(null);
    setSubmitting(false);

    setCustomer(null);
    setBuyer(null);
    setCustomerDetail(null);
    setBuyerDetail(null);

    setWeight("");
    setTotalValue("");
    setValueCurrency("USD");
    setService("");
    setPackageDescription("");
    setHsCode("");
    setHsError(null);

    setSrn("");
    setSrnError(null);

    setSaleChannel("");
    setTaxRef("");
    setTaxNumber("");

    setServices([]);
    setQuoteMeta(null);
    setServicesErr(null);
  }, [isOpen]);

  /* search providers */
  const searchCustomers = useMemo(
    () => async (q: string) => {
      const params = new URLSearchParams({ page: "1", pageSize: "10", q: q.trim() });
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = (Array.isArray(data) ? data : data.customers) ?? [];
      return list.map((c: any) => ({ id: c.id, label: `${c.name} — ${c.phone}` }));
    },
    []
  );

  const searchBuyers = useMemo(
    () => async (q: string) => {
      const params = new URLSearchParams({ page: "1", pageSize: "10", q: q.trim() });
      const res = await fetch(`/api/buyers?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = data.buyers ?? [];
      return list.map((b: any) => ({
        id: b.id,
        label: `${b.buyerFullName} — ${b.buyerCountry}${b.buyerCity ? ", " + b.buyerCity : ""}`,
      }));
    },
    []
  );

  /* load selected details */
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!customer?.id) return setCustomerDetail(null);
      setDetailsLoading((s) => ({ ...s, customer: true }));
      try {
        const r = await fetch(`/api/customers/${customer.id}`);
        if (r.ok) {
          const c: CustomerDetail = await r.json();
          if (!cancelled) setCustomerDetail(c);
        }
      } finally {
        if (!cancelled) setDetailsLoading((s) => ({ ...s, customer: false }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [customer]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!buyer?.id) return setBuyerDetail(null);
      setDetailsLoading((s) => ({ ...s, buyer: true }));
      try {
        const r = await fetch(`/api/buyers/${buyer.id}`);
        if (r.ok) {
          const b: BuyerDetail = await r.json();
          if (!cancelled) setBuyerDetail(b);
        }
      } finally {
        if (!cancelled) setDetailsLoading((s) => ({ ...s, buyer: false }));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [buyer]);

  /* HS code validation */
  function localHsCheck(code: string): string | null {
    const trimmed = code.trim();
    if (!/^\d+$/.test(trimmed)) return "HS Code must be numeric";
    if (!(trimmed.length === 6 || trimmed.length === 10))
      return "Please enter either 10 or 6 characters HS Code.";
    return null;
  }

  async function validateHsCode(code: string) {
    const basic = localHsCheck(code);
    if (basic) {
      setHsError(basic);
      return;
    }
    try {
      const r = await fetch(`/api/kurasi/validate-hscode?hsCode=${encodeURIComponent(code.trim())}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          j?.returnCode === "007"
            ? "HSCode must be 6 or 10 digits."
            : j?.returnCode === "008"
            ? "Incorrect HSCode"
            : j?.error || "HS Code validation failed";
        setHsError(msg);
      } else {
        setHsError(null);
      }
    } catch {
      setHsError("Failed to validate HS Code");
    }
  }

  /* SRN uniqueness check */
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedSrn) {
        setSrnError("SRN is required.");
        return;
      }
      try {
        const r = await fetch(`/api/srns/check?srn=${encodeURIComponent(debouncedSrn)}`);
        const j = await r.json().catch(() => ({}));
        if (!cancelled) setSrnError(j?.exists ? "This SRN already exists." : null);
      } catch {
        if (!cancelled) setSrnError(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSrn]);

  /* Kurasi quote (uses fixed "IDR" currencyType) */
  async function fetchKurasiServices(args: { country: string; weightGrams: number }) {
    setServicesErr(null);
    setServices([]);
    setQuoteMeta(null);
    setServicesLoading(true);
    try {
      const r = await fetch("/api/kurasi/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: args.country,
          actualWeight: String(args.weightGrams),
          actualHeight: "0",
          actualLength: "0",
          actualWidth: "0",
          currencyType: "IDR", // <— FIXED
          supportedCountryCode: "ID",
        }),
      });
      const j = await r.json();
      if (!r.ok || j?.status !== "SUCCESS") {
        throw new Error(j?.errorMessage || "Failed to quote services");
      }
      setQuoteMeta(j.meta || null);
      setServices(j.available || []);
    } catch (e: any) {
      setServicesErr(e?.message || "Could not load services");
    } finally {
      setServicesLoading(false);
    }
  }

  useEffect(() => {
    const cc = buyerDetail?.buyerCountry?.trim();
    const g = Number(weight);
    if (!cc || !g || Number.isNaN(g) || g <= 0) {
      setServices([]);
      setQuoteMeta(null);
      return;
    }
    fetchKurasiServices({ country: cc, weightGrams: g });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyerDetail?.buyerCountry, weight]);

  useEffect(() => {
    if (services.length && !service) setService(services[0].code);
  }, [services, service]);

  /* nested create handlers */
  function handleCustomerCreated(c?: {
    id: string;
    name: string;
    phone: string;
    phoneCode?: string | null;
    shopeeName?: string | null;
  }) {
    if (c?.id) {
      setCustomer({ id: c.id, label: `${c.name} — ${c.phone}` });
      setCustomerDetail({
        id: c.id,
        name: c.name,
        phone: c.phone,
        phoneCode: c.phoneCode ?? null,
        shopeeName: c.shopeeName ?? null,
      });
    }
    setCreateCustomerOpen(false);
  }

  function handleBuyerCreated(b?: {
    id: string;
    buyerFullName: string;
    buyerCountry: string;
    buyerCity?: string | null;
    buyerPhone?: string | null;
  }) {
    if (b?.id) {
      const label = `${b.buyerFullName} — ${b.buyerCountry}${b.buyerCity ? ", " + b.buyerCity : ""}`;
      setBuyer({ id: b.id, label });
      setBuyerDetail(null); // will refetch
    }
    setCreateBuyerOpen(false);
    setBuyerSeed(null);
  }

  /* submit */
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      if (!customer?.id || !buyer?.id) throw new Error("Please choose customer and recipient.");
      if (!weight || Number(weight) <= 0) throw new Error("Total Weight is required.");
      if (!service) throw new Error("Please choose a service.");
      if (!totalValue) throw new Error("Total Value is required.");
      if (!packageDescription.trim()) throw new Error("Package Description is required.");

      if (!srn.trim()) throw new Error("SRN is required.");
      if (srnError) throw new Error(srnError);

      // optional HS code validation before submit
      if (hsCode.trim()) {
        const local = localHsCheck(hsCode);
        if (local) throw new Error(local);
      }

      const payload = {
        customerId: customer.id,
        buyerId: buyer.id,
        service,
        weightGrams: Number(weight),
        currency: valueCurrency,
        totalValue: totalValue.trim(),
        package: {
          packageDescription: packageDescription.trim(),
          hsCode: hsCode.trim() || null,
        },
        srn: srn.trim(),
        saleChannel: saleChannel || null,
        taxReference: taxRef || null,
        taxNumber: taxRef ? taxNumber.trim() : null,

        // defaults
        localStatus: "in_progress",
        deliveryStatus: "not_yet_create_label",
        paymentMethod: "qris",
        placedAt: new Date().toISOString(),
        notes: null,
      };

      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to create order");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  /* render */
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100">
        <form onSubmit={onSubmit} className="max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <div className="space-y-8">
            {err && (
              <div className="px-3 py-2 rounded border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
                {err}
              </div>
            )}

            {/* Customer / Recipient */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Customer / Recipient Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer */}
                <div className="space-y-2">
                  <AsyncSearchSelect
                    label="Customer * *"
                    placeholder="Search name / phone…"
                    value={customer}
                    onChange={setCustomer}
                    fetcher={searchCustomers}
                    required
                    onCreateNew={() => setCreateCustomerOpen(true)}
                    createLabel="Create new customer"
                  />
                  {customer && (
                    <div className="rounded-md border p-3 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                      {detailsLoading.customer ? (
                        <div className="text-gray-500">Loading customer…</div>
                      ) : customerDetail ? (
                        <div className="space-y-1">
                          <div className="font-medium">{customerDetail.name}</div>
                          <DetailRow label="Shopee" value={customerDetail.shopeeName || undefined} />
                          <DetailRow label="Phone" value={customerDetail.phone} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Recipient */}
                <div className="space-y-2">
                  <AsyncSearchSelect
                    label="Recipient * *"
                    placeholder="Search name / country / city / phone…"
                    value={buyer}
                    onChange={setBuyer}
                    fetcher={searchBuyers}
                    required
                    onCreateNew={(q) => {
                      setBuyerSeed(parseRecipientSeed(q));
                      setCreateBuyerOpen(true);
                    }}
                    createLabel="Create new recipient"
                  />
                  {buyer && (
                    <div className="rounded-md border p-3 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                      {detailsLoading.buyer ? (
                        <div className="text-gray-500">Loading recipient…</div>
                      ) : buyerDetail ? (
                        <div className="space-y-1">
                          <div className="font-medium">{buyerDetail.buyerFullName}</div>
                          <DetailRow label="Phone" value={buyerDetail.buyerPhone || undefined} />
                          <DetailRow label="Email" value={buyerDetail.buyerEmail || undefined} />
                          <DetailRow label="Address 1" value={buyerDetail.buyerAddress1} />
                          <DetailRow label="Address 2" value={buyerDetail.buyerAddress2 || undefined} />
                          <DetailRow label="City" value={buyerDetail.buyerCity} />
                          <DetailRow label="State/Province" value={buyerDetail.buyerState || undefined} />
                          <DetailRow label="ZIP/Postal Code" value={buyerDetail.buyerZip} />
                          <DetailRow label="Country" value={buyerDetail.buyerCountry} />
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Package details */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Package Details
              </h3>

              {/* weight / value / currency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Total Weight (gram) *</label>
                  <input
                    className="input w-full"
                    type="number"
                    min={1}
                    required
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="e.g. 1500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Total Value *</label>
                  <input
                    className="input w-full"
                    inputMode="decimal"
                    required
                    placeholder="e.g. 1 or 120.00"
                    value={totalValue}
                    onChange={(e) => setTotalValue(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Currency *</label>
                  <select
                    className="input w-full"
                    value={valueCurrency}
                    onChange={(e) => setValueCurrency(e.target.value)}
                  >
                    {["USD", "GBP", "AUD", "EUR", "IDR", "SGD"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* service */}
              <div className="mt-4">
                <label className="block text-sm mb-1">Service Name *</label>
                <Combobox
                  items={services.map((s) => ({
                    code: s.code,
                    name: `${s.title || s.code} · ${s.displayAmount}`,
                  }))}
                  value={service}
                  onChange={(code: string) => setService(code)}
                  getKey={(i: { code: string }) => i.code}
                  getLabel={(i: { name: string }) => i.name}
                  placeholder={
                    !buyerDetail?.buyerCountry || !Number(weight)
                      ? "Enter weight & pick recipient first"
                      : servicesLoading
                      ? "Loading services…"
                      : servicesErr || "Type to search service…"
                  }
                  disabled={!buyerDetail?.buyerCountry || !Number(weight) || servicesLoading}
                  showChevron={false}
                  ariaLabel="Service"
                />
                {(buyerDetail?.buyerCountry && Number(weight)) && (
                  <div className="mt-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="space-x-3">
                      {quoteMeta?.volumetricWeight != null && (
                        <span>Volumetric: {quoteMeta.volumetricWeight} g</span>
                      )}
                      {quoteMeta?.chargeableWeight != null && (
                        <span>Chargeable: {quoteMeta.chargeableWeight} g</span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        const cc = buyerDetail?.buyerCountry;
                        const g = Number(weight);
                        if (cc && g > 0) fetchKurasiServices({ country: cc, weightGrams: g });
                      }}
                    >
                      Refresh
                    </button>
                  </div>
                )}
              </div>

              {/* description / HS */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Package Description *</label>
                  <input
                    className="input w-full"
                    required
                    placeholder="Describe the contents"
                    value={packageDescription}
                    onChange={(e) => setPackageDescription(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">HS Code *</label>
                  <div className="relative">
                    <input
                      className={`input w-full ${hsError ? "border-red-500" : ""}`}
                      placeholder="6 or 10 digits"
                      value={hsCode}
                      onChange={(e) => {
                        setHsCode(e.target.value);
                        setHsError(null);
                      }}
                      onBlur={() => hsCode.trim() && validateHsCode(hsCode)}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600"
                      title="Validate HS Code"
                      onClick={() => validateHsCode(hsCode)}
                    >
                      🔍
                    </button>
                  </div>
                  {hsError && <p className="mt-1 text-xs text-red-600">{hsError}</p>}
                </div>
              </div>

              {/* SRN */}
              <div className="mt-4">
                <label className="block text-sm mb-1">SRN (Sale Record Number) *</label>
                <input
                  className={`input w-full ${srnError ? "border-red-500" : ""}`}
                  required
                  placeholder="Must be unique"
                  value={srn}
                  onChange={(e) => setSrn(e.target.value)}
                />
                {srnError && <p className="mt-1 text-xs text-red-600">{srnError}</p>}
              </div>

              {/* Marketplace tax info */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm mb-1">Sale Channel</label>
                  <select
                    className="input w-full"
                    value={saleChannel}
                    onChange={(e) => setSaleChannel(e.target.value as any)}
                  >
                    <option value="">—</option>
                    <option value="Ebay">eBay</option>
                    <option value="Etsy">Etsy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Tax Reference</label>
                  <select
                    className="input w-full"
                    value={taxRef}
                    onChange={(e) => setTaxRef(e.target.value as any)}
                  >
                    <option value="">—</option>
                    <option value="SST">SST</option>
                    <option value="VAT">VAT</option>
                    <option value="GST">GST</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">
                    TAX Number {taxRef ? "*" : ""}
                  </label>
                  <input
                    className="input w-full"
                    placeholder={taxRef ? "Required for chosen Tax Reference" : "Optional"}
                    required={!!taxRef}
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Delivery details */}
            <section>
              <h3 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-200">
                Delivery Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Local Status</label>
                  <select className="input w-full text-xs" defaultValue="in_progress">
                    <option value="in_progress">In Progress</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Delivery Status</label>
                  <select className="input w-full text-xs" defaultValue="not_yet_create_label">
                    <option value="not_yet_create_label">Not Yet Create Label</option>
                    <option value="label_confirmed">Label Confirmed</option>
                    <option value="ready_to_send">Ready to Send</option>
                    <option value="tracking_received">Tracking Received</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Payment Method</label>
                  <select className="input w-full" defaultValue="qris">
                    <option value="qris">QRIS</option>
                    <option value="transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea className="input w-full min-h-[90px]" placeholder="Optional notes" />
                </div>
              </div>
            </section>
          </div>

          {/* footer */}
          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create Order"}
            </button>
          </div>
        </form>
      </div>

      {/* nested modals */}
      <CustomerModal
        isOpen={createCustomerOpen}
        mode="create"
        onClose={() => setCreateCustomerOpen(false)}
        onSuccess={handleCustomerCreated}
      />
      <RecipientModal
        isOpen={createBuyerOpen}
        mode="create"
        onClose={() => setCreateBuyerOpen(false)}
        initial={buyerSeed || undefined}
        onSuccess={handleBuyerCreated}
      />
    </Modal>
  );
}
