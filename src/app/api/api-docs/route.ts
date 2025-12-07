import { NextResponse } from 'next/server';
import { apiDocsGenerator } from '@/lib/api-docs-generator';
import { prisma } from '@/lib/prisma';

type BuyerRow = {
  id: string;
  name: string | null;
  saleRecordNumber: string | null;
  // ...other Buyer columns...
  orders_count: number;
};

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<BuyerRow[]>`
      SELECT b.*,
             (SELECT COUNT(*) FROM "Order" o WHERE o."buyerId" = b."id") AS orders_count
      FROM "Buyer" b
      ORDER BY CAST(b."saleRecordNumber" AS INTEGER) ASC
      -- For Postgres use: ORDER BY NULLIF(b."saleRecordNumber",'')::int ASC
      -- For MySQL use:    ORDER BY CAST(b.saleRecordNumber AS UNSIGNED) ASC
    `;

    const buyers = rows.map(r => ({
      ...r,
      _count: { orders: Number(r.orders_count) },
    }));

    return NextResponse.json(buyers);
  } catch (error) {
    console.error('Error fetching buyers:', error);
    return NextResponse.json({ error: 'Failed to fetch buyers' }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Clear cache and regenerate
    apiDocsGenerator.clearCache();
    const endpoints = apiDocsGenerator.generateDocumentation();
    return NextResponse.json({ endpoints, message: 'Documentation refreshed successfully' });
  } catch (error) {
    console.error('Error refreshing API documentation:', error);
    return NextResponse.json(
      { error: 'Failed to refresh API documentation' },
      { status: 500 }
    );
  }
}