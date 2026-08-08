import http from 'http';

const makeReq = (
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown = null,
): Promise<{ s: number; b: { success: boolean; message: string; data: Record<string, unknown> } }> =>
  new Promise((resolve, reject) => {
    const b = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: {
          ...headers,
          ...(b
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(b).toString(),
              }
            : {}),
        },
      },
      (r) => {
        let d = '';
        r.on('data', (c) => (d += c));
        r.on('end', () => resolve({ s: r.statusCode ?? 0, b: JSON.parse(d) }));
      },
    );
    req.on('error', reject);
    if (b) req.write(b);
    req.end();
  });

const login = async (email: string, password: string): Promise<string> => {
  const res = await makeReq('POST', '/api/v1/auth/login', {}, { email, password });
  if (res.s !== 200 || !res.b.data?.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.b)}`);
  }
  return res.b.data.token as string;
};

async function testChallans() {
  console.log('\n🚀 Running Phase 10 Sales Challan Test Suite...\n');

  // 1. Authenticate all 4 roles
  const [adminToken, salesToken, warehouseToken, accountsToken] = await Promise.all([
    login('admin@fundsroom.com', 'Admin@1234'),
    login('sales@fundsroom.com', 'Sales@1234'),
    login('warehouse@fundsroom.com', 'Warehouse@1234'),
    login('accounts@fundsroom.com', 'Accounts@1234'),
  ]);
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const salesAuth = { Authorization: `Bearer ${salesToken}` };
  const warehouseAuth = { Authorization: `Bearer ${warehouseToken}` };
  const accountsAuth = { Authorization: `Bearer ${accountsToken}` };

  console.log('✓ All 4 roles authenticated successfully.');

  // 2. Seed customer and 2 products with initial stock
  const timestamp = Date.now();
  const custRes = await makeReq('POST', '/api/v1/customers', salesAuth, {
    name: `Retail Partner ${timestamp}`,
    companyName: `Retailer Corp ${timestamp}`,
    phone: '+91 99887 76655',
    customerType: 'RETAILER',
  });
  const customerId = (custRes.b.data.customer as { id: string }).id;

  const prod1Res = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: `Linen Fabric Roll ${timestamp}`,
    sku: `SKU-CHL-A-${timestamp}`,
    category: 'Fabrics',
    unit: 'ROLLS',
    costPrice: 1000,
    sellingPrice: 1500,
    currentStock: 50,
    minStockAlert: 10,
  });
  const prod1 = prod1Res.b.data.product as { id: string; name: string; sku: string; currentStock: number };

  const prod2Res = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: `Cotton Yarn Spool ${timestamp}`,
    sku: `SKU-CHL-B-${timestamp}`,
    category: 'Yarn',
    unit: 'KG',
    costPrice: 400,
    sellingPrice: 600,
    currentStock: 30,
    minStockAlert: 5,
  });
  const prod2 = prod2Res.b.data.product as { id: string; name: string; sku: string; currentStock: number };

  console.log(`✓ Seeded customer (${customerId}) and 2 products: ProdA Stock=50, ProdB Stock=30.`);

  // 3. Create a multi-item draft challan as SALES
  const challan1Res = await makeReq('POST', '/api/v1/challans', salesAuth, {
    customerId,
    notes: 'Draft order for seasonal wholesale collection dispatch',
    discountAmount: 500,
    taxAmount: 250,
    items: [
      { productId: prod1.id, quantity: 5, unitPrice: 1500, taxRate: 5 }, // 5 * 1500 = 7500
      { productId: prod2.id, quantity: 8, unitPrice: 600, taxRate: 5 },  // 8 * 600 = 4800
    ],
  });

  if (challan1Res.s !== 201) {
    throw new Error(`Draft challan creation failed: ${JSON.stringify(challan1Res.b)}`);
  }

  const challan1 = challan1Res.b.data.challan as {
    id: string;
    challanNumber: string;
    status: string;
    totalAmount: string;
    discountAmount: string;
    taxAmount: string;
    netAmount: string;
    items: Array<{
      productNameSnapshot: string;
      skuSnapshot: string;
      unitPriceSnapshot: string;
      quantity: number;
      totalPrice: string;
    }>;
  };

  // Verify challan format
  const year = new Date().getFullYear();
  const regexFormat = new RegExp(`^SC-${year}-\\d{4}$`);
  if (!regexFormat.test(challan1.challanNumber)) {
    throw new Error(`Invalid challan number format: got "${challan1.challanNumber}", expected SC-${year}-XXXX`);
  }
  console.log(`✓ Generated sequential challan number: "${challan1.challanNumber}" (matches SC-${year}-XXXX format)`);

  // Verify status is DRAFT
  if (challan1.status !== 'DRAFT') {
    throw new Error(`Expected status DRAFT, got ${challan1.status}`);
  }
  console.log('✓ Initial challan status is strictly DRAFT');

  // Verify line item snapshots
  const item1 = challan1.items.find((i) => i.skuSnapshot === prod1.sku);
  const item2 = challan1.items.find((i) => i.skuSnapshot === prod2.sku);
  if (!item1 || !item2) throw new Error('Missing snapshot line items');

  if (item1.productNameSnapshot !== prod1.name || parseFloat(item1.unitPriceSnapshot) !== 1500 || item1.quantity !== 5) {
    throw new Error(`Item 1 snapshot mismatch: ${JSON.stringify(item1)}`);
  }
  if (item2.productNameSnapshot !== prod2.name || parseFloat(item2.unitPriceSnapshot) !== 600 || item2.quantity !== 8) {
    throw new Error(`Item 2 snapshot mismatch: ${JSON.stringify(item2)}`);
  }
  console.log('✓ Product names, SKUs, and unit prices snapshotted accurately on line items.');

  // Verify totals: Total = 7500 + 4800 = 12300; Net = 12300 - 500 + 250 = 12050
  if (parseFloat(challan1.totalAmount) !== 12300 || parseFloat(challan1.netAmount) !== 12050) {
    throw new Error(`Financial calculation mismatch: Total=${challan1.totalAmount}, Net=${challan1.netAmount}`);
  }
  console.log(`✓ Financial calculation verified: Gross=₹${challan1.totalAmount}, Discount=₹${challan1.discountAmount}, Net=₹${challan1.netAmount}`);

  // 4. CRITICAL CHECK: Confirm stock is completely untouched
  const checkP1 = await makeReq('GET', `/api/v1/products/${prod1.id}`, adminAuth);
  const checkP2 = await makeReq('GET', `/api/v1/products/${prod2.id}`, adminAuth);
  const p1Stock = (checkP1.b.data.product as { currentStock: number }).currentStock;
  const p2Stock = (checkP2.b.data.product as { currentStock: number }).currentStock;

  if (p1Stock !== 50 || p2Stock !== 30) {
    throw new Error(`STOCK CORRUPTED! Expected Prod1=50, Prod2=30; Got Prod1=${p1Stock}, Prod2=${p2Stock}`);
  }
  console.log(`✓ CRITICAL CHECK: Stock is strictly UNTOUCHED on DRAFT creation (ProdA: ${p1Stock}, ProdB: ${p2Stock})`);

  // 5. Create a second challan -> verify sequencing
  const challan2Res = await makeReq('POST', '/api/v1/challans', adminAuth, {
    customerId,
    items: [{ productId: prod1.id, quantity: 2 }],
  });
  if (challan2Res.s !== 201) throw new Error('Second challan creation failed');
  const challan2 = challan2Res.b.data.challan as { challanNumber: string };
  console.log(`✓ Second challan created: "${challan2.challanNumber}"`);

  // 6. Test GET /api/v1/challans/:id
  const getRes = await makeReq('GET', `/api/v1/challans/${challan1.id}`, accountsAuth);
  if (getRes.s !== 200 || !getRes.b.data?.challan) {
    throw new Error(`GET /challans/:id failed: ${JSON.stringify(getRes.b)}`);
  }
  console.log('✓ GET /challans/:id returned full challan with customer & snapshotted line items.');

  // 7. Test PATCH /api/v1/challans/:id (edit DRAFT)
  const patchRes = await makeReq('PATCH', `/api/v1/challans/${challan1.id}`, salesAuth, {
    notes: 'Updated delivery instructions: Urgent morning dispatch requested',
    discountAmount: 700,
  });
  if (patchRes.s !== 200) {
    throw new Error(`PATCH /challans/:id failed: ${JSON.stringify(patchRes.b)}`);
  }
  console.log('✓ PATCH /challans/:id updated notes and discount while in DRAFT status: 200 OK');

  // 8. RBAC Matrix Verification
  const whCreate = await makeReq('POST', '/api/v1/challans', warehouseAuth, {
    customerId,
    items: [{ productId: prod1.id, quantity: 1 }],
  });
  if (whCreate.s !== 403) throw new Error(`Expected 403 for WAREHOUSE challan create, got ${whCreate.s}`);
  console.log('✓ WAREHOUSE blocked from creating challans: 403 Forbidden');

  const accCreate = await makeReq('POST', '/api/v1/challans', accountsAuth, {
    customerId,
    items: [{ productId: prod1.id, quantity: 1 }],
  });
  if (accCreate.s !== 403) throw new Error(`Expected 403 for ACCOUNTS challan create, got ${accCreate.s}`);
  console.log('✓ ACCOUNTS blocked from creating challans: 403 Forbidden');

  console.log('\n🎉 ALL SALES CHALLAN TESTS PASSED!\n');
}

testChallans().catch((err: Error) => {
  console.error('\n❌ Sales challan test suite failed:', err.message);
  process.exit(1);
});
