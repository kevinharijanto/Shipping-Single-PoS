"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import RecipientModal from "@/components/RecipientModal";

type BuyerSRN = {
  saleRecordNumber: number;
  kurasiShipmentId: string | null;
  trackingNumber: string | null;
  trackingSlug: string | null;
};

type Buyer = {
  id: string;
  buyerFullName: string;
  buyerAddress1: string;
  buyerAddress2: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;
  buyerEmail: string | null;
  buyerPhone: string;   // E.164
  phoneCode: string;    // e.g. "+62"
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  srns: BuyerSRN[]; // kept in type, just not rendered in list
};

type BuyersResponse = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalFiltered: number;
  totalBuyers: number;
  totalSRN: number;
  buyers: Buyer[];
};

// --- tiny debounce hook -------------------------------------------------------
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function DotSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" role="status" aria-label="loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor" />
    </svg>
  );
}
// -----------------------------------------------------------------------------

export default function BuyersPage() {
  const [data, setData] = useState<BuyersResponse | null>(null);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedQ = useDebounced(searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // modal state (create/edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] = useState<null | {
    id?: string;
    buyerFullName?: string;
    buyerPhone?: string;
    buyerEmail?: string;
    buyerAddress1?: string;
    buyerAddress2?: string; 
    buyerCity?: string;
    buyerState?: string;
    buyerZip?: string;
    buyerCountry?: string;
  }>(null);

  // abortable fetch bound to page/pageSize/debounced search
  async function fetchBuyers(q: string, p: number, ps: number) {
    // cancel previous in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        page: String(p),
        pageSize: String(ps),
        q: q.trim(),
      });
      const res = await fetch(`/api/buyers?${qs.toString()}`, { signal: ac.signal });
      if (!res.ok) throw new Error("Failed to fetch buyers");
      const payload: BuyersResponse = await res.json();
      setData(payload);
      setBuyers(payload.buyers);
      setIsFirstLoad(false);
      if (p > payload.totalPages) setPage(payload.totalPages || 1);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "An error occurred");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  // refetch when page / pageSize / debounced search changes
  useEffect(() => {
    fetchBuyers(debouncedQ, page, pageSize);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedQ]);

  async function deleteBuyer(id: string) {
    if (!confirm("Delete this recipient? (Only allowed if they have 0 orders)")) return;
    try {
      const res = await fetch(`/api/buyers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Failed to delete");
      }
      fetchBuyers(debouncedQ, page, pageSize);
    } catch (e: any) {
      setError(e?.message || "An error occurred");
    }
  }

  const filtered = useMemo(() => buyers, [buyers]);

  if (isFirstLoad && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading recipients…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Recipients</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage international recipients</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Recipients</div>
            <div className="font-semibold">{data?.totalBuyers ?? 0}</div>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total SRNs</div>
            <div className="font-semibold">{data?.totalSRN ?? 0}</div>
          </div>
          <button
            onClick={() => {
              setModalMode("create");
              setModalInitial(null);
              setModalOpen(true);
            }}
            className="btn btn-primary"
          >
            Add Recipient
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="w-full sm:max-w-xl">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search (name / country / city / phone / SRN / KRS / tracking)
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              className="input w-full pr-8"
              placeholder="e.g. 'KRS2205', 'ID', 'Jakarta', '129', '+4479…'"
              aria-busy={loading}
            />
            {loading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <DotSpinner />
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="card overflow-hidden hidden xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <Th>Recipient</Th>
                <Th>Country / City</Th>
                <Th>Phone</Th>
                {/* Removed SRNs / KRS / Tracking column */}
                <Th>Orders</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody
              className={`bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700 transition-opacity ${
                loading ? "opacity-60" : "opacity-100"
              }`}
            >
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No recipients match your search." : "No recipients yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="align-top">
                    <Td>
                      <div className="font-medium">
                        <Link href={`/buyers/${b.id}`} className="text-primary hover:underline">
                          {b.buyerFullName}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{b.buyerAddress1}</div>
                    </Td>
                    <Td>
                      <div>{b.buyerCountry}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{b.buyerCity}</div>
                    </Td>
                    <Td>
                      <code className="text-sm">{b.buyerPhone}</code>
                    </Td>

                    {/* Removed SRN/KRS/Tracking cell */}

                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {b._count.orders} orders
                      </span>
                    </Td>
                    <Td>
                      <div className="flex gap-3">
                        <Link href={`/buyers/${b.id}`} className="text-primary hover:underline">
                          View
                        </Link>
                        <button
                          className="text-indigo-600 hover:underline"
                          onClick={() => {
                            setModalMode("edit");
                            setModalInitial({
                              id: b.id,
                              buyerFullName: b.buyerFullName,
                              buyerPhone: b.buyerPhone,
                              buyerEmail: b.buyerEmail ?? "", 
                              buyerAddress1: b.buyerAddress1,
                              buyerAddress2: b.buyerAddress2 ?? "",
                              buyerCity: b.buyerCity,
                              buyerState: b.buyerState,
                              buyerZip: b.buyerZip,
                              buyerCountry: b.buyerCountry,
                            });
                            setModalOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBuyer(b.id)}
                          className={`text-red-600 hover:underline ${b._count.orders > 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                          title={b._count.orders > 0 ? "Cannot delete recipient with orders" : "Delete recipient"}
                          disabled={b._count.orders > 0}
                        >
                          Delete
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="xl:hidden space-y-4">
        {filtered.length === 0 ? (
          <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? "No recipients match your search." : "No recipients yet."}
          </div>
        ) : (
          filtered.map((b) => (
            <div key={b.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/buyers/${b.id}`} className="font-semibold text-primary hover:underline">
                    {b.buyerFullName}
                  </Link>
                  <div className="text-sm text-gray-500">
                    {b.buyerCountry} · {b.buyerCity}
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {b._count.orders} orders
                </span>
              </div>

              <div className="mt-3 text-sm">
                <div className="text-gray-600 dark:text-gray-300">
                  <code>{b.buyerPhone}</code>
                </div>

                {/* Removed SRN/KRS/Tracking preview on mobile as well */}
              </div>

              <div className="flex gap-2 mt-4">
                <Link href={`/buyers/${b.id}`} className="btn btn-sm btn-outline flex-1">
                  View
                </Link>
                <button
                  className="btn btn-sm btn-secondary flex-1"
                  onClick={() => {
                    setModalMode("edit");
                    setModalInitial({
                      id: b.id,
                      buyerFullName: b.buyerFullName,
                      buyerPhone: b.buyerPhone,
                      buyerAddress1: b.buyerAddress1,
                      buyerCity: b.buyerCity,
                      buyerState: b.buyerState,
                      buyerZip: b.buyerZip,
                      buyerCountry: b.buyerCountry,
                    });
                    setModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteBuyer(b.id)}
                  className="btn btn-sm btn-danger flex-1 disabled:opacity-50"
                  disabled={b._count.orders > 0}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-semibold">{data.page}</span> of{" "}
            <span className="font-semibold">{data.totalPages}</span> ·{" "}
            <span className="font-semibold">{data.totalFiltered}</span>{" "}
            result{data.totalFiltered === 1 ? "" : "s"}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(parseInt(e.target.value, 10));
              }}
              className="input !py-1 !px-2"
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>

            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              ‹ Prev
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
            >
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Recipient Modal */}
      <RecipientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchBuyers(debouncedQ, page, pageSize);
          setModalOpen(false);
        }}
        mode={modalMode}
        initial={modalInitial || undefined}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{children}</td>;
}
