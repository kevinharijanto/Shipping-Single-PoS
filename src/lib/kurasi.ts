import axios from "axios";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import tz from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(tz);

const API_URL = "https://api.kurasi.app/api/v1/shipmentManagement";
const TZ = "Asia/Jakarta";

type KurasiQuery = {
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  clientCode?: string; // optional; leave blank to fetch all for the token
  sortType?: "ASC" | "DESC";
  flagText?: "All" | string;
  saleRecordNumber?: string;
  kurasiShipmentId?: string;
  country?: string[];
  serviceName?: string[];
  saleChannel?: string[];
  index: number;       // page index
  limit: number;       // page size
};

// We don't rely on exact response shape; we map defensively.
export type KurasiShipment = Record<string, any>;

export async function fetchKurasiPage(params: KurasiQuery): Promise<{
  rows: KurasiShipment[];
  total?: number;
}> {
  const token = process.env.KURASI_TOKEN || process.env.X_SHIP_AUTH_TOKEN;
  if (!token) throw new Error("KURASI_TOKEN is required in env");

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
    clientCode: params.clientCode ?? "", // often required, but token may scope it
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
    // no need for special httpsAgent unless you hit TLS issues
  });

  // Kurasi usually returns { data: { rows, total } } or just array; handle both.
  const data = res.data;
  if (Array.isArray(data)) return { rows: data };
  if (data?.rows) return { rows: data.rows, total: data.total };
  if (data?.data?.rows) return { rows: data.data.rows, total: data.data.total };
  // fallback: try to coerce
  if (data?.data && Array.isArray(data.data)) return { rows: data.data };
  return { rows: [] };
}

// ---- Recipient mapper (defensive: supports multiple possible keys) ----
export type BuyerInput = {
  saleRecordNumber: string;
  buyerFullName: string;
  buyerAddress1: string;
  buyerAddress2: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;
  buyerPhone: string;
  phoneCode: string;              // <— NEW
};

const S = (v: any) => (v == null ? "" : String(v).trim());

export function toBuyerInput(row: KurasiShipment): BuyerInput | null {
  const srn = S(row.saleRecordNumber) || S(row.receiptNumber) || (S(row.kurasiShipmentId) ? `KRS-${S(row.kurasiShipmentId)}` : "");
  if (!srn) return null;

  return {
    saleRecordNumber: srn,
    buyerFullName:    S(row.buyerFullName),
    buyerAddress1:    S(row.buyerAddress1),
    buyerAddress2:    S(row.buyerAddress2), // empty ok
    buyerCity:        S(row.buyerCity),
    buyerState:       S(row.buyerState),
    buyerZip:         S(row.buyerZip),
    buyerCountry:     S(row.buyerCountry),
    buyerPhone:       S(row.buyerPhone),
    phoneCode:        S(row.phoneCode),     // <— NEW (stores "+1", "+61", etc.)
  };
}

// Date utilities
export function formatYMD(d: Date | string) {
  return dayjs(d).tz(TZ).format("YYYY-MM-DD");
}
export function todayYMD() {
  return formatYMD(new Date());
}
