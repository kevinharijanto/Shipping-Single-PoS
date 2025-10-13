import {
  PrismaClient,
  Service,
  PaymentMethod,
  LocalDeliveryStatus,
  DeliveryStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1) Customer (local buyer)
  const customer = await prisma.customer.upsert({
    where: { phone: '0812-0000-0000' }, // phone is indexed; good natural key for upsert
    update: {},
    create: {
      name: 'Local Buyer A',
      phone: '0812-0000-0000',
      shopeeName: 'buyer_a',
    },
  });

  // 2) Recipient (final receiver)
  const recipient = await prisma.recipient.create({
    data: {
      fullName: 'Anna YoLo',
      address1: 'PO Box 524',
      city: 'Black Hawk',
      state: 'CO',
      zip: '80422',
      country: 'US',
      phone: '0303362372',
      phoneCode: '1',
      isNoPhone: false,
      shipmentCategory: 'M',
      saleRecordNumber: '2945',
      shipmentRemark: '',
      iossCheck: false,
    },
  });

  // 3) Package detail
  const pkg = await prisma.packageDetail.create({
    data: {
      weightGrams: 100,
      lengthCm: '10', // Decimal fields in Prisma expect strings
      widthCm: '10',
      heightCm: '10',
      service: Service.express,
      volumetricGrams: 0,
    },
  });

  // 4) Order + one item
  const order = await prisma.order.create({
    data: {
      placedAt: new Date(),
      notes: 'Photocard order',
      customerId: customer.id,
      recipientId: recipient.id,
      packageId: pkg.id,

      paymentMethod: PaymentMethod.bank_transfer,
      localStatus: LocalDeliveryStatus.on_the_way,
      deliveryStatus: DeliveryStatus.not_yet_create_label,

      currency: 'USD',
      quotedAmountMinor: 700, // $7.00

      items: {
        create: [
          {
            description: 'photo',
            quantity: 1,
            valueMinor: 700,
            itemWeightGrams: 100,
            currency: 'USD',
            hsCode: '490900',
            countryOfOrigin: 'ID',
          },
        ],
      },
    },
    include: { customer: true, recipient: true, package: true, items: true },
  });

  console.log('✅ Seeded order:', order.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
