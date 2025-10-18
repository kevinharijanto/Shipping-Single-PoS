import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { orders: true }
        }
      }
    });
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, phoneCode, shopeeName } = body;
    
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }
    
    // Check if phone already exists
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone }
    });
    
    if (existingCustomer) {
      return NextResponse.json({ error: 'Customer with this phone number already exists' }, { status: 409 });
    }
    
    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        phoneCode: phoneCode || "+62",
        shopeeName: shopeeName || null
      }
    });
    
    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}