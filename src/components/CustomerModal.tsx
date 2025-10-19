// src/components/CustomerModal.tsx
"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";

type Mode = "create" | "edit";

type Initial = {
  id?: string;
  name?: string;
  phone?: string;        // raw or E.164; server will normalize
  phoneCode?: string;    // optional, e.g. "+62"
  shopeeName?: string;
};

export default function CustomerModal({
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
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    phoneCode: "+62",
    shopeeName: "",
  });

  useEffect(() => {
    if (!isOpen) return;
    setErr(null);
    setForm({
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      phoneCode: initial?.phoneCode ?? "+62",
      shopeeName: initial?.shopeeName ?? "",
    });
  }, [isOpen, initial]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        phoneCode: form.phoneCode.trim(),
        shopeeName: form.shopeeName.trim() || null,
      };

      // basic required check on the client
      if (!payload.name || !payload.phone) {
        throw new Error("Please fill all required fields.");
      }

      let res: Response;
      if (mode === "create") {
        res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        if (!initial?.id) throw new Error("Missing customer id for edit.");
        res = await fetch(`/api/customers/${initial.id}`, {
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
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (mode === "create" ? "Add Customer" : "Edit Customer")}
      size="md"
    >
      <div className="rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100">
        <form onSubmit={onSubmit} className="space-y-6 p-4 sm:p-6">
          {err && (
            <div className="px-3 py-2 rounded border bg-red-50 border-red-200 text-red-700
                            dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
              {err}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Name *</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="Customer full name"
                autoComplete="name"
              />
            </div>

            {/* Phone */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Phone *</label>
              <input
                name="phone"
                value={form.phone}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="+62… or local format"
                autoComplete="tel"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Will be normalized to E.164 on save.
              </p>
            </div>

            {/* Phone code (optional override / display) */}
            <div>
              <label className="block text-sm mb-1">Phone Code</label>
              <input
                name="phoneCode"
                value={form.phoneCode}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="+62"
                autoComplete="tel-country-code"
              />
            </div>

            {/* Shopee name (optional) */}
            <div>
              <label className="block text-sm mb-1">Shopee Name</label>
              <input
                name="shopeeName"
                value={form.shopeeName}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Shopee username"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
