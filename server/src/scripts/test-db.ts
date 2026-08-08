import prisma from '../config/prisma';

async function main() {
  console.log('Testing PostgreSQL + Prisma connection and schema...');

  // Test model counts
  const userCount = await prisma.user.count();
  const customerCount = await prisma.customer.count();
  const followupCount = await prisma.customerFollowup.count();
  const productCount = await prisma.product.count();
  const stockMovementCount = await prisma.stockMovement.count();
  const salesChallanCount = await prisma.salesChallan.count();
  const salesChallanItemCount = await prisma.salesChallanItem.count();

  console.log('✅ Models verified:');
  console.log({
    users: userCount,
    customers: customerCount,
    customerFollowups: followupCount,
    products: productCount,
    stockMovements: stockMovementCount,
    salesChallans: salesChallanCount,
    salesChallanItems: salesChallanItemCount,
  });

  // Test inserting a test record with snapshots and rollback/cleanup
  const testUser = await prisma.user.create({
    data: {
      email: `test_${Date.now()}@fundsroom.com`,
      password: 'hashed_password_sample',
      name: 'System Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  const testProduct = await prisma.product.create({
    data: {
      name: 'Premium Basmati Rice 25kg',
      sku: `SKU-RICE-${Date.now()}`,
      category: 'Grains',
      unit: 'BAG',
      costPrice: 1800.0,
      sellingPrice: 2250.0,
      currentStock: 100,
      minStockAlert: 15,
    },
  });

  const testCustomer = await prisma.customer.create({
    data: {
      name: 'Acme Wholesale Traders',
      phone: '+919876543210',
      email: 'orders@acmetraders.com',
      creditLimit: 500000.0,
      customerType: 'WHOLESALER',
      status: 'ACTIVE',
    },
  });

  const testChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: `CHAL-TEST-${Date.now()}`,
      customerId: testCustomer.id,
      createdById: testUser.id,
      status: 'DRAFT',
      totalAmount: 22500.0,
      taxAmount: 1125.0,
      netAmount: 23625.0,
      items: {
        create: [
          {
            productId: testProduct.id,
            productNameSnapshot: testProduct.name,
            skuSnapshot: testProduct.sku,
            unitPriceSnapshot: testProduct.sellingPrice,
            taxRateSnapshot: 5.0,
            quantity: 10,
            totalPrice: 22500.0,
          },
        ],
      },
    },
    include: {
      items: true,
      customer: true,
      createdBy: true,
    },
  });

  console.log('✅ Created test challan with items snapshot:');
  console.log({
    challanId: testChallan.id,
    challanNumber: testChallan.challanNumber,
    customer: testChallan.customer.name,
    itemSnapshotProduct: testChallan.items[0].productNameSnapshot,
    itemSnapshotPrice: testChallan.items[0].unitPriceSnapshot.toString(),
  });

  // Cleanup test records
  await prisma.salesChallanItem.deleteMany({ where: { salesChallanId: testChallan.id } });
  await prisma.salesChallan.delete({ where: { id: testChallan.id } });
  await prisma.customer.delete({ where: { id: testCustomer.id } });
  await prisma.product.delete({ where: { id: testProduct.id } });
  await prisma.user.delete({ where: { id: testUser.id } });

  console.log('✅ Database test completed and cleaned up successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
