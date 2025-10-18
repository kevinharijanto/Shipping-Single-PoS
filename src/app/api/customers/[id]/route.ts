import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { placedAt: 'desc' },
          include: {
            buyer: true,
            package: true
          }
        }
      }
    });
    
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, phoneCode, shopeeName } = body;
    
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }
    
    // Check if phone already exists for another customer
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        phone,
        id: { not: id }
      }
    });
    
    if (existingCustomer) {
      return NextResponse.json({ error: 'Another customer with this phone number already exists' }, { status: 409 });
    }
    
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        phone,
        phoneCode: phoneCode || "+62",
        shopeeName: shopeeName || null
      }
    });
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if customer has orders
    const orderCount = await prisma.order.count({
      where: { customerId: id }
    });
    
    if (orderCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete customer with existing orders'
      }, { status: 400 });
    }
    
    await prisma.customer.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}