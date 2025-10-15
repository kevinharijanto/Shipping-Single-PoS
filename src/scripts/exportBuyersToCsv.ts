#!/usr/bin/env ts-node
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import fs from "node:fs";
import path from "node:path";
import { format } from "fast-csv";

const BATCH = 1000;

async function main() {
  const dir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const out = path.join(dir, `buyers-${new Date().toISOString().replace(/[:T]/g,"-").slice(0,19)}.csv`);

  const ws = fs.createWriteStream(out);
  // Excel needs BOM for UTF-8
  ws.write("\uFEFF");

  const csv = format({ headers: true, writeBOM: false });
  csv.pipe(ws);

  let skip = 0;
  let total = 0;

  for (;;) {
    const rows = await prisma.buyer.findMany({
      orderBy: { id: "asc" },
      skip,
      take: BATCH,
      select: {
        saleRecordNumber: true,
        buyerFullName: true,
        buyerAddress1: true,
        buyerAddress2: true,
        buyerCity: true,
        buyerState: true,
        buyerZip: true,
        buyerCountry: true,
        buyerPhone: true,
        phoneCode: true,
      },
    });
    if (!rows.length) break;

    for (const r of rows) csv.write(r);
    total += rows.length;
    skip += rows.length;
    console.log(`wrote ${total}…`);
  }

  csv.end();
  await new Promise((res) => ws.on("finish", res));
  console.log(`Done → ${out}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
