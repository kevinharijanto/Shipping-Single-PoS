import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [
      totalOrders,
      totalCustomers,
      totalBuyers,
      ordersInProgress,
      ordersPendingPayment,
      ordersPaid,
      recentOrders
    ] = await Promise.all([
      prisma.order.count(),
      prisma.customer.count(),
      prisma.buyer.count(),
      prisma.order.count({ where: { localStatus: 'in_progress' } }),
      prisma.order.count({ where: { localStatus: 'pending_payment' } }),
      prisma.order.count({ where: { localStatus: 'paid' } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { placedAt: 'desc' },
        include: {
          customer: true,
          buyer: true,
          package: true
        }
      })
    ]);

    return NextResponse.json({
      totalOrders,
      totalCustomers,
      totalBuyers,
      ordersInProgress,
      ordersPendingPayment,
      ordersPaid,
      recentOrders
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}