// src/lib/kurasi.ts
import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
import { normalizeCountryCode } from "@/lib/countryMapping";
import { parsePhoneNumberFromString, getCountryCallingCode } from "libphonenumber-js";

dayjs.extend(utc);
dayjs.extend(tz);

const API_URL = "https://api.kurasi.app/api/v1/shipmentManagement";
const TZ = "Asia/Jakarta";

// helper: best-effort phone parse; never block insert
function normalizeOrKeepRawPhone(raw: string, iso2: string): { phone: string; phoneCode: string } {
  const trimmed = (raw || "").trim();
  if (!trimmed) return { phone: "", phoneCode: "" };

  // 1) Try strict parse
  const p = parsePhoneNumberFromString(trimmed, iso2);
  if (p && p.isValid()) {
    return { phone: p.number, phoneCode: `+${p.countryCallingCode}` }; // E.164
  }

  // 2) Fallbacks (store raw):
  //    - phoneCode from leading +digits (e.g., "+44...")
  const m = trimmed.match(/^\+(\d{1,4})/);
  if (m) return { phone: trimmed, phoneCode: `+${m[1]}` };

  //    - otherwise, derive from country if possible (best effort)
  try {
    const cc = getCountryCallingCode(iso2 as any);
    return { phone: trimmed, phoneCode: cc ? `+${cc}` : "" };
  } catch {
    return { phone: trimmed, phoneCode: "" };
  }
}

/* =========================
   Types
========================= */

export type KurasiQuery = {
  startDate: string;             // "YYYY-MM-DD"
  endDate: string;               // "YYYY-MM-DD"
  clientCode?: string;           // optional; token may scope it
  sortType?: "ASC" | "DESC";
  flagText?: string;             // "All" or a specific status
  saleRecordNumber?: string;     // filter string per Kurasi
  kurasiShipmentId?: string;
  country?: string[];
  serviceName?: string[];
  saleChannel?: string[];
  index: number;                 // offset
  limit: number;                 // page size
};

// Raw shipment row (we keep it loose)
export type KurasiShipment = Record<string, any>;

// What the crawler needs after normalization
export type KurasiBuyerInput = {
  saleRecordNumber: number;  // strictly numeric SRN (we skip if NaN)
  buyerFullName: string;
  buyerAddress1: string;
  buyerAddress2: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;      // ISO-2 uppercase
  buyerEmail: string;        // always a string ("" if missing)
  buyerPhone: string;        // E.164, e.g., "+17206929493"
  phoneCode: string;         // e.g., "+1"
};

/* =========================
   HTTP: fetch a page
========================= */

export async function fetchKurasiPage(params: KurasiQuery): Promise<{
  rows: KurasiShipment[];
  total?: number;
}> {
  const token = process.env.KURASI_TOKEN || process.env.X_SHIP_AUTH_TOKEN;
  if (!token) throw new Error("KURASI_TOKEN (X-Ship-Auth-Token) is required in env");

  const body = {
    startDate: params.startDate,
    endDate: params.endDate,
    sortType: params.sortType ?? "ASC",
    flagText: params.flagText ?? "All",
    saleRecordNumber: params.saleRecordNumber ?? "",
    kurasiShipmentId: params.kurasiShipmentId ?? "",
    country: params.country ?? [],
    serviceName: params.serviceName ?? [],
    saleChannel: params.saleChannel ?? [],
    clientCode: params.clientCode ?? "",
    index: params.index,
    limit: params.limit,
  };

  const res = await axios.post(API_URL, body, {
    headers: {
      Accept: "application/json, text/plain, */*, text/csv",
      "Content-Type": "application/json; charset=UTF-8",
      Origin: "https://kurasi.app",
      "X-Requested-With": "XMLHttpRequest",
      "X-Ship-Auth-Token": token,
    },
    timeout: 120_000,
  });

  // Handle various response shapes:
  //  A) { data: [ ... ], total: N }
  //  B) { data: { data: [ ... ], total: N } }
  //  C) [ ... ]
  const payload = res.data;
  if (Array.isArray(payload)) return { rows: payload };
  if (payload?.rows) return { rows: payload.rows, total: payload.total };
  if (payload?.data?.rows) return { rows: payload.data.rows, total: payload.data.total };
  if (Array.isArray(payload?.data)) return { rows: payload.data };
  if (Array.isArray(payload?.data?.data)) return { rows: payload.data.data, total: payload.data.total };

  return { rows: [] };
}

/* =========================
   Normalizers & Mappers
========================= */

const S = (v: any) => (v == null ? "" : String(v).trim());

/**
 * Normalize a raw phone using libphonenumber-js, with country hint.
 * Returns E.164 phone, phoneCode ("+62"), and possibly normalized ISO2 (if lib detects).
 */
function normalizePhone(raw: string, iso2Hint: string): { e164: string; phoneCode: string; country?: string } | null {
  const p = parsePhoneNumberFromString(raw, iso2Hint);
  if (!p || !p.isValid()) return null;
  return {
    e164: p.number,                     // "+1..."
    phoneCode: `+${p.countryCallingCode}`,
    country: p.country ?? undefined,    // e.g., "US"
  };
}

/**
 * Map a Kurasi row into a normalized Buyer input for our DB.
 * - Requires a numeric saleRecordNumber (skips otherwise)
 * - Normalizes country to ISO-2
 * - Normalizes phone to E.164 and derives phoneCode
 * - buyerEmail is always a string ("" if missing)
 */
export function toBuyerInput(row: KurasiShipment): KurasiBuyerInput | null {
  // SRN: keep your numeric SRN rule (or change schema to String if you want to capture all)
  const srnNum = Number(String(row.saleRecordNumber ?? "").trim());
  if (!Number.isFinite(srnNum)) return null;

  const iso2 = normalizeCountryCode(String(row.buyerCountry || ""));
  if (!iso2) return null;

  const { phone, phoneCode } = normalizeOrKeepRawPhone(String(row.buyerPhone || ""), iso2);

  // IMPORTANT: if you require phone non-empty, you can still skip empty here.
  // If you want to store even empty phones, remove this check.
  if (!phone) return null;

  return {
    saleRecordNumber: srnNum,
    buyerFullName: String(row.buyerFullName || "").trim(),
    buyerAddress1: String(row.buyerAddress1 || "").trim(),
    buyerAddress2: String(row.buyerAddress2 || "").trim(),
    buyerCity: String(row.buyerCity || "").trim(),
    buyerState: String(row.buyerState || "").trim(),
    buyerZip: String(row.buyerZip || "").trim(),
    buyerCountry: iso2.toUpperCase(),
    buyerEmail: String(row.buyerEmail ?? "").toLowerCase().trim(),
    buyerPhone: phone,        // E.164 if valid, RAW otherwise (e.g. "+4479449755416")
    phoneCode,                // derived from parse or best-effort
  };
}

/* =========================
   Date utilities
========================= */

export function formatYMD(d: Date | string) {
  return dayjs(d).tz(TZ).format("YYYY-MM-DD");
}
export function todayYMD() {
  return formatYMD(new Date());
}
