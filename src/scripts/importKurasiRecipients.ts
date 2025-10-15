#!/usr/bin/env ts-node
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { fetchKurasiPage, toBuyerInput, todayYMD } from "@/lib/kurasi";

const LIMIT       = Number(process.env.KURASI_LIMIT || 3000);
const CLIENT_CODE = process.env.KURASI_CLIENT_CODE || "K0016794";
const START_DATE  = process.env.KURASI_START_DATE  || "2018-01-15";

async function upsertBuyerBatch(buyers: (ReturnType<typeof toBuyerInput>)[]) {
  const valid = buyers.filter((b): b is NonNullable<typeof b> => Boolean(b));
  if (!valid.length) return { count: 0, skipped: buyers.length };

  const ops = valid.map((b) =>
    prisma.buyer.upsert({
      where: { saleRecordNumber: b.saleRecordNumber }, // UNIQUE
      update: {
        buyerFullName:  b.buyerFullName,
        buyerAddress1:  b.buyerAddress1,
        buyerAddress2:  b.buyerAddress2,
        buyerCity:      b.buyerCity,
        buyerState:     b.buyerState,
        buyerZip:       b.buyerZip,
        buyerCountry:   b.buyerCountry,
        buyerPhone:     b.buyerPhone,
        phoneCode:      b.phoneCode,
      },
      create: b,
      select: { id: true },
    })
  );

  await prisma.$transaction(ops, { timeout: 60_000 });
  return { count: ops.length, skipped: buyers.length - valid.length };
}


async function testOne() {
  const end = todayYMD();
  const { rows } = await fetchKurasiPage({
    startDate: START_DATE,
    endDate: end,
    clientCode: CLIENT_CODE,
    sortType: "ASC",
    flagText: "All",
    saleRecordNumber: "",
    kurasiShipmentId: "",
    country: [],
    serviceName: [],
    saleChannel: [],
    index: 0,
    limit: 1,
  });

  if (!rows.length) return console.log("No rows.");
  const buyer = toBuyerInput(rows[0]);
  if (!buyer) {
    console.log("Skipped (missing required fields). Sample:", rows[0]);
    return;
  }
  const res = await prisma.buyer.upsert({
    where: { saleRecordNumber: buyer.saleRecordNumber },
    update: buyer,
    create: buyer,
    select: { id: true, saleRecordNumber: true },
  });
  console.log("Test insert result:", res);
}

async function crawlAll() {
  const end = todayYMD();
  let index = 0;
  let total = Infinity;
  let processed = 0;

  console.log(`Crawling: ${START_DATE} → ${end}, limit=${LIMIT}, clientCode=${CLIENT_CODE}`);

  while (index < total) {
    const { rows, total: apiTotal } = await fetchKurasiPage({
      startDate: START_DATE,
      endDate: end,
      clientCode: CLIENT_CODE,
      sortType: "ASC",
      flagText: "All",
      saleRecordNumber: "",
      kurasiShipmentId: "",
      country: [],
      serviceName: [],
      saleChannel: [],
      index,
      limit: LIMIT,
    });

    if (typeof apiTotal === "number") total = apiTotal;

    if (!rows.length) {
      console.log(`No rows at index=${index}. Stopping.`);
      break;
    }

    console.log(`Page @ index=${index} → ${rows.length} rows`);
    // const buyers = rows.map((r) => toBuyerInput(r));
    // const inserted = await upsertBuyerBatch(buyers);
    // processed += inserted;
    const buyers = rows.map((r) => toBuyerInput(r));
    const { count, skipped } = await upsertBuyerBatch(buyers);
    processed += count;
    if (skipped) console.log(`  (skipped this page: ${skipped} rows without any identifier)`);

    index += LIMIT;
    if (rows.length < LIMIT && total === Infinity) break;
  }

  console.log(`Done. Upserted=${processed}. Reported total=${isFinite(total) ? total : "unknown"}`);
}

async function main() {
  if (process.argv.includes("--test-one")) await testOne();
  else await crawlAll();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
