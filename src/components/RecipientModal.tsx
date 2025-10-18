// src/components/RecipientModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";

type Mode = "create" | "edit";

type Initial = {
  id?: string;
  buyerFullName?: string;
  buyerPhone?: string;
  buyerAddress1?: string;
  buyerCity?: string;
  buyerState?: string;
  buyerZip?: string;
  buyerCountry?: string;
};

export default function RecipientModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: Mode;
  initial?: Initial;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    buyerFullName: "",
    buyerPhone: "",
    buyerAddress1: "",
    buyerCity: "",
    buyerState: "",
    buyerZip: "",
    buyerCountry: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      buyerFullName: initial?.buyerFullName ?? "",
      buyerPhone:    initial?.buyerPhone    ?? "",
      buyerAddress1: initial?.buyerAddress1 ?? "",
      buyerCity:     initial?.buyerCity     ?? "",
      buyerState:    initial?.buyerState    ?? "",
      buyerZip:      initial?.buyerZip      ?? "",
      buyerCountry:  initial?.buyerCountry  ?? "",
    });
  }, [isOpen, initial]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { buyerFullName, buyerPhone, buyerAddress1, buyerCity, buyerZip, buyerCountry } = form;
      if (!buyerFullName || !buyerPhone || !buyerAddress1 || !buyerCity || !buyerZip || !buyerCountry) {
        throw new Error("Please fill all required fields.");
      }

      const payload = {
        buyerFullName: buyerFullName.trim(),
        buyerPhone:    buyerPhone.trim(),
        buyerAddress1: buyerAddress1.trim(),
        buyerCity:     buyerCity.trim(),
        buyerState:    form.buyerState.trim(),
        buyerZip:      buyerZip.trim(),
        buyerCountry:  buyerCountry.trim(),
      };

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/buyers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (!initial?.id) throw new Error("Missing buyer id for edit.");
        res = await fetch(`/api/buyers/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Request failed");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title ?? (mode === "create" ? "Add Recipient" : "Edit Recipient")}
    size="md"
  >
    {/* Panel wrapper for dark mode + padding */}
    <div className="rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100">
      <form onSubmit={onSubmit} className="space-y-6 p-4 sm:p-6">
        {error && (
          <div className="px-3 py-2 rounded border
                          bg-red-50 border-red-200 text-red-700
                          dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full name */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Full Name *</label>
            <input
              name="buyerFullName"
              value={form.buyerFullName}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="Recipient full name"
              autoComplete="off"
            />
          </div>

          {/* Phone */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Phone Number *</label>
            <input
              name="buyerPhone"
              value={form.buyerPhone}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="+62…"
              autoComplete="off"
            />
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Address *</label>
            <input
              name="buyerAddress1"
              value={form.buyerAddress1}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="Street address"
              autoComplete="off"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm mb-1">City *</label>
            <input
              name="buyerCity"
              value={form.buyerCity}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="City"
              autoComplete="off"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-sm mb-1">State/Province</label>
            <input
              name="buyerState"
              value={form.buyerState}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="State / Province"
              autoComplete="off"
            />
          </div>

          {/* Zip */}
          <div>
            <label className="block text-sm mb-1">ZIP/Postal Code *</label>
            <input
              name="buyerZip"
              value={form.buyerZip}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="ZIP / Postal code"
              autoComplete="off"
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm mb-1">Country *</label>
            <input
              name="buyerCountry"
              value={form.buyerCountry}
              onChange={onChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                         focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
              placeholder="US, ID, GB, …"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Footer with subtle divider */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button type="button" onClick={onClose} className="btn">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading
              ? mode === "create" ? "Creating…" : "Saving…"
              : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </form>
    </div>
  </Modal>
);

}
