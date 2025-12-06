#!/usr/bin/env ts-node
import "dotenv/config";
import fs from "node:fs";
import dayjs from "dayjs";
import { prisma } from "@/lib/prisma";
import {
  fetchKurasiPage,
  toBuyerInput,
  todayYMD,
  formatYMD,
  type KurasiBuyerInput,
} from "@/lib/kurasi";

/**
 * ENV / Tunables
 * --------------
 * KURASI_CLIENT_CODE: e.g. K0016794
 * KURASI_START_DATE : e.g. 2018-01-01
 * KURASI_END_DATE   : default = today
 * KURASI_LIMIT      : per-page size (500–1000 is a good range)
 * KURASI_CHUNK      : DB upsert chunk size (100–500 is safe on SQLite)
 * KURASI_CHECKPOINT : path to resume file (default: ./kurasi.checkpoint.json)
 */
const CLIENT_CODE = process.env.KURASI_CLIENT_CODE || "K0016794";
const START_DATE = process.env.KURASI_START_DATE || "2018-01-01";
const END_DATE = process.env.KURASI_END_DATE || todayYMD();
const LIMIT = Number(process.env.KURASI_LIMIT || 800);
const CHUNK = Number(process.env.KURASI_CHUNK || 300);
const CHECKPOINT = process.env.KURASI_CHECKPOINT || "./kurasi.checkpoint.json";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const S = (v: any) => (v == null ? "" : String(v).trim());

/** Pick shipment + tracking fields for BuyerSRN */
function pickSrnExtras(row: any): {
  saleRecordNumber: number | null;
  kurasiShipmentId: string | null;
  trackingNumber: string | null;
  trackingSlug: string | null;
} {
  // SRN must remain numeric because BuyerSRN.saleRecordNumber is Int @id
  const srnStr = S(row.saleRecordNumber);
  const srnNum = Number(srnStr);
  const kurasiShipmentId = S(row.kurasiShipmentId) || null;

  // prefer top-level trackingNumber; else first trackingList item
  const list0 =
    Array.isArray(row.trackingList) && row.trackingList.length
      ? row.trackingList[0]
      : null;

  const trackingNumber = S(row.trackingNumber) || (list0 ? S(list0.trackingNumber) : "");
  // slug: try list slug; else carrier (lowercased)
  const trackingSlug = (list0 ? S(list0.slug) : "") || S(row.carrier).toLowerCase();

  return {
    saleRecordNumber: Number.isFinite(srnNum) ? srnNum : null,
    kurasiShipmentId,
    trackingNumber: trackingNumber || null,
    trackingSlug: trackingSlug || null,
  };
}

/** Retry wrapper for Kurasi API */
async function fetchKurasiPageWithRetry(
  args: Parameters<typeof fetchKurasiPage>[0],
  maxAttempts = 5
) {
  let attempt = 0;
  let lastErr: any;
  while (attempt < maxAttempts) {
    try {
      return await fetchKurasiPage(args);
    } catch (e: any) {
      const status = e?.response?.status;
      const retriable = status >= 500 || status === 429 || !status;
      if (!retriable) throw e;
      lastErr = e;
      attempt++;
      const wait = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 400);
      console.warn(
        `Kurasi ${status ?? "net"} error (attempt ${attempt}/${maxAttempts}). retry in ${wait}ms...`
      );
      await sleep(wait);
      // shrink page size on repeated failures
      if (attempt >= 2 && args.limit > 200) {
        args.limit = Math.max(200, Math.floor(args.limit / 2));
      }
    }
  }
  throw lastErr;
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Batch record shape */
type RowMapped = {
  buyer: KurasiBuyerInput | null; // from toBuyerInput (may be null to skip)
  srn: ReturnType<typeof pickSrnExtras>; // shipment/track extras
};

/** One DB chunk upsert (Buyer upsert + SRN upsert WITH tracking fields) */
async function upsertBuyerChunk(batch: { buyer: KurasiBuyerInput; srn: ReturnType<typeof pickSrnExtras> }[]) {
  await prisma.$transaction(
    async (tx) => {
      for (const { buyer: b, srn } of batch) {
        // 1) Upsert Buyer by (country, phone)
        const buyer = await tx.buyer.upsert({
          where: {
            buyerCountry_buyerPhone: {
              buyerCountry: b.buyerCountry,
              buyerPhone: b.buyerPhone,
            },
          },
          update: {
            buyerFullName: b.buyerFullName,
            buyerAddress1: b.buyerAddress1,
            buyerAddress2: b.buyerAddress2,
            buyerCity: b.buyerCity,
            buyerState: b.buyerState,
            buyerZip: b.buyerZip,
            buyerEmail: b.buyerEmail || "",
          },
          create: {
            buyerFullName: b.buyerFullName,
            buyerAddress1: b.buyerAddress1,
            buyerAddress2: b.buyerAddress2,
            buyerCity: b.buyerCity,
            buyerState: b.buyerState,
            buyerZip: b.buyerZip,
            buyerCountry: b.buyerCountry,
            buyerEmail: b.buyerEmail || "",
            buyerPhone: b.buyerPhone,  // E.164 format
          },
          select: { id: true },
        });

        // 2) Upsert SRN with fast-lookup tracking fields
        await tx.buyerSRN.upsert({
          where: { saleRecordNumber: srn.saleRecordNumber! },
          update: {
            buyerId: buyer.id,
            kurasiShipmentId: srn.kurasiShipmentId,
            trackingNumber: srn.trackingNumber,
            trackingSlug: srn.trackingSlug,
          },
          create: {
            saleRecordNumber: srn.saleRecordNumber!,
            buyerId: buyer.id,
            kurasiShipmentId: srn.kurasiShipmentId,
            trackingNumber: srn.trackingNumber,
            trackingSlug: srn.trackingSlug,
          },
        });
      }
    },
    { timeout: 60_000 }
  );
}

/** Batch upsert with DB chunking */
async function upsertBuyerBatch(rows: RowMapped[]) {
  // keep only rows with a mapped buyer AND numeric SRN
  const valid = rows.filter(
    (r): r is { buyer: KurasiBuyerInput; srn: ReturnType<typeof pickSrnExtras> } =>
      Boolean(r.buyer) && r.srn.saleRecordNumber != null
  );
  for (const c of chunk(valid, CHUNK)) {
    await upsertBuyerChunk(c);
  }
  return { processed: valid.length, skipped: rows.length - valid.length };
}

/** Checkpoint helpers (resume newest→oldest at month granularity) */
function loadCheckpoint(): string | null {
  try {
    if (fs.existsSync(CHECKPOINT)) {
      const s = JSON.parse(fs.readFileSync(CHECKPOINT, "utf8"));
      return s?.monthEnd || null; // e.g. "2025-09-30"
    }
  } catch { }
  return null;
}
function saveCheckpoint(monthEnd: string) {
  try {
    if (monthEnd) fs.writeFileSync(CHECKPOINT, JSON.stringify({ monthEnd }), "utf8");
    else if (fs.existsSync(CHECKPOINT)) fs.unlinkSync(CHECKPOINT); // clear on success
  } catch { }
}

/** Main crawl: newest → oldest, monthly slices, paginated inside each month */
async function crawlAll() {
  const endInclusive = dayjs(END_DATE).endOf("month");
  const absoluteStart = dayjs(START_DATE).startOf("month");
  let monthEnd = dayjs(loadCheckpoint() || formatYMD(endInclusive.toDate())); // resume or end
  let processed = 0;
  let skipped = 0;

  console.log(
    `Crawling (newest→oldest): ${formatYMD(absoluteStart.toDate())} → ${formatYMD(
      endInclusive.toDate()
    )}, limit=${LIMIT}, clientCode=${CLIENT_CODE}`
  );

  while (monthEnd.isSame(absoluteStart) || monthEnd.isAfter(absoluteStart)) {
    const monthStart = monthEnd.startOf("month");
    const startYMD = formatYMD(monthStart.toDate());
    const endYMD = formatYMD(monthEnd.toDate());
    console.log(`→ Month ${startYMD} … ${endYMD}`);

    let index = 0;
    let page = 0;
    let lastCount = LIMIT;

    while (lastCount === LIMIT) {
      const { rows } = await fetchKurasiPageWithRetry({
        startDate: startYMD,
        endDate: endYMD,
        clientCode: CLIENT_CODE,
        sortType: "DESC", // newest first within slice
        flagText: "All",
        saleRecordNumber: "",
        kurasiShipmentId: "",
        country: [],
        serviceName: [],
        saleChannel: [],
        index,
        limit: LIMIT,
      });

      lastCount = rows.length;
      if (!rows.length) {
        if (page === 0) console.log("   (no rows)");
        break;
      }

      console.log(`   page ${page} @ index=${index} → ${rows.length} rows`);

      const mapped: RowMapped[] = rows.map((r) => ({
        buyer: toBuyerInput(r), // your existing normalization (now tolerant to store raw phones)
        srn: pickSrnExtras(r),  // shipment/tracking fields for BuyerSRN
      }));

      const res = await upsertBuyerBatch(mapped);
      processed += res.processed;
      skipped += res.skipped;
      if (res.skipped) {
        console.log(`   (skipped this page: ${res.skipped} rows missing identifiers)`);
      }

      index += LIMIT;
      page++;
    }

    // checkpoint to previous month end (so resume picks up from there)
    const prevEnd = monthEnd.subtract(1, "month").endOf("month");
    saveCheckpoint(formatYMD(prevEnd.toDate()));
    monthEnd = prevEnd;
  }

  saveCheckpoint(""); // clear on success
  console.log(`Done. Upserted=${processed}. Skipped=${skipped}.`);
}

/** Entrypoint */
async function main() {
  await crawlAll();
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
