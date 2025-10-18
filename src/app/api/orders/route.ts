import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (status) {
      if (['in_progress', 'on_the_way', 'pending_payment', 'paid'].includes(status)) {
        where.localStatus = status;
      } else if (['not_yet_create_label', 'label_confirmed', 'ready_to_send', 'tracking_received'].includes(status)) {
        where.deliveryStatus = status;
      }
    }
    
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { placedAt: 'desc' },
        include: {
          customer: true,
          buyer: true,
          package: true
        }
      }),
      prisma.order.count({ where })
    ]);
    
    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Create order request payload', body);
    const {
      customerId,
      buyerId,
      notes,
      weightGrams,
      totalValue,
      packageDescription,
      lengthCm,
      widthCm,
      heightCm,
      service,
      quotedAmountMinor,
      shippingPriceMinor,
      currency,
      pricingSource,
      paymentMethod,
      sku,
      hsCode,
      countryOfOrigin
    } = body;
    
    if (!customerId || !buyerId || !service) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
    }
    
    // Create package detail first
    const packageDetail = await prisma.packageDetail.create({
      data: {
        weightGrams: weightGrams || null,
        totalValue: totalValue ? parseFloat(totalValue) : null,
        packageDescription: packageDescription || null,
        lengthCm: lengthCm ? parseFloat(lengthCm) : null,
        widthCm: widthCm ? parseFloat(widthCm) : null,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        service,
        currency: currency || 'USD',
        sku: sku || null,
        hsCode: hsCode || null,
        countryOfOrigin: countryOfOrigin || null
      } as any
    });
    
    // Create order
    const order = await prisma.order.create({
      data: {
        placedAt: new Date(),
        customerId,
        buyerId: parseInt(buyerId),
        packageId: packageDetail.id,
        notes: notes || null,
        quotedAmountMinor: quotedAmountMinor ? parseInt(quotedAmountMinor) : null,
        shippingPriceMinor: shippingPriceMinor ? parseInt(shippingPriceMinor) : null,
        currency: currency || 'USD',
        pricingSource: pricingSource || null,
        paymentMethod: paymentMethod || 'qris',
      } as any,
      include: {
        customer: true,
        buyer: true,
        package: true
      }
    });
    
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}