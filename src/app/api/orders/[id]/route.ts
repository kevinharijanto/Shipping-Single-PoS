import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        buyer: true,
        package: true
      }
    });
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      notes,
      localStatus,
      deliveryStatus,
      paymentMethod,
      externalRef,
      labelId,
      trackingLink,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      service,
      currency,
      sku,
      hsCode,
      countryOfOrigin
    } = body;
    
    // Update package if provided
    if (
      weightGrams !== undefined ||
      lengthCm !== undefined ||
      widthCm !== undefined ||
      heightCm !== undefined ||
      service ||
      currency !== undefined ||
      sku !== undefined ||
      hsCode !== undefined ||
      countryOfOrigin !== undefined
    ) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { package: true }
      });
      
      if (order) {
        await prisma.packageDetail.update({
          where: { id: order.packageId },
          data: {
            ...(weightGrams !== undefined && { weightGrams }),
            ...(lengthCm !== undefined && { lengthCm: lengthCm ? parseFloat(lengthCm) : null }),
            ...(widthCm !== undefined && { widthCm: widthCm ? parseFloat(widthCm) : null }),
            ...(heightCm !== undefined && { heightCm: heightCm ? parseFloat(heightCm) : null }),
            ...(service && { service }),
            ...(currency !== undefined && { currency: currency || null }),
            ...(sku !== undefined && { sku: sku || null }),
            ...(hsCode !== undefined && { hsCode: hsCode || null }),
            ...(countryOfOrigin !== undefined && { countryOfOrigin: countryOfOrigin || null })
          }
        });
      }
    }
    
    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(localStatus && { localStatus }),
        ...(deliveryStatus && { deliveryStatus }),
        ...(paymentMethod && { paymentMethod }),
        ...(externalRef !== undefined && { externalRef }),
        ...(labelId !== undefined && { labelId }),
        ...(trackingLink !== undefined && { trackingLink }),
        ...(currency !== undefined && { currency: currency || null })
      },
      include: {
        customer: true,
        buyer: true,
        package: true
      }
    });
    
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.order.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}