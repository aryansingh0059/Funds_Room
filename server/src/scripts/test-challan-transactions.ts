import http from 'http';

const makeReq = (
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown = null,
): Promise<{ s: number; b: { success: boolean; message: string; data?: Record<string, unknown>; error?: Record<string, unknown> } }> =>
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

async function testChallanTransactions() {
  console.log('\n🚀 Running Phase 11 Challan Confirm/Cancel Critical Stock Transactions Test Suite...\n');

  // Authenticate
  const [adminToken, salesToken] = await Promise.all([
    login('admin@fundsroom.com', 'Admin@1234'),
    login('sales@fundsroom.com', 'Sales@1234'),
  ]);
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const salesAuth = { Authorization: `Bearer ${salesToken}` };

  console.log('✓ Roles authenticated successfully.');

  // Seed customer and products
  const timestamp = Date.now();
  const custRes = await makeReq('POST', '/api/v1/customers', salesAuth, {
    name: `Wholesale Client ${timestamp}`,
    companyName: `Wholesale Hub ${timestamp}`,
    phone: '+91 91234 56789',
    customerType: 'WHOLESALER',
  });
  const customerId = (custRes.b.data!.customer as { id: string }).id;

  const prodARes = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: `Premium Silk Roll ${timestamp}`,
    sku: `SKU-SLK-${timestamp}`,
    category: 'Silk',
    unit: 'METERS',
    costPrice: 800,
    sellingPrice: 1200,
    currentStock: 40,
    minStockAlert: 10,
  });
  const prodA = prodARes.b.data!.product as { id: string; name: string; sku: string; currentStock: number };

  const prodBRes = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: `Organic Cotton Bale ${timestamp}`,
    sku: `SKU-CTN-${timestamp}`,
    category: 'Cotton',
    unit: 'BALES',
    costPrice: 500,
    sellingPrice: 750,
    currentStock: 25,
    minStockAlert: 5,
  });
  const prodB = prodBRes.b.data!.product as { id: string; name: string; sku: string; currentStock: number };

  console.log(`✓ Seeded test products: ProdA=${prodA.sku} (Stock=40), ProdB=${prodB.sku} (Stock=25).`);

  // ==========================================
  // TEST 1: Confirm challan with sufficient stock
  // ==========================================
  console.log('\n--- TEST 1: Confirm Draft Challan with Sufficient Stock ---');
  const validChallanRes = await makeReq('POST', '/api/v1/challans', salesAuth, {
    customerId,
    items: [
      { productId: prodA.id, quantity: 10 },
      { productId: prodB.id, quantity: 5 },
    ],
  });
  const challan1Id = (validChallanRes.b.data!.challan as { id: string }).id;
  const challan1Number = (validChallanRes.b.data!.challan as { challanNumber: string }).challanNumber;

  const confirm1Res = await makeReq('POST', `/api/v1/challans/${challan1Id}/confirm`, adminAuth);
  if (confirm1Res.s !== 200) {
    throw new Error(`Confirm failed: ${JSON.stringify(confirm1Res.b)}`);
  }
  const confirmedChallan = confirm1Res.b.data!.challan as { status: string };
  if (confirmedChallan.status !== 'CONFIRMED' && confirmedChallan.status !== 'APPROVED') {
    throw new Error(`Expected CONFIRMED status, got ${confirmedChallan.status}`);
  }

  // Verify stock reduction in database
  const checkA1 = await makeReq('GET', `/api/v1/products/${prodA.id}`, adminAuth);
  const checkB1 = await makeReq('GET', `/api/v1/products/${prodB.id}`, adminAuth);
  const stockA1 = (checkA1.b.data!.product as { currentStock: number }).currentStock;
  const stockB1 = (checkB1.b.data!.product as { currentStock: number }).currentStock;

  if (stockA1 !== 30 || stockB1 !== 20) {
    throw new Error(`Stock deduction mismatch! Expected ProdA=30, ProdB=20; got ProdA=${stockA1}, ProdB=${stockB1}`);
  }
  console.log(`✓ Stock reduced atomically: ProdA (40 -> ${stockA1}), ProdB (25 -> ${stockB1})`);

  // Verify Stock Movements were written
  const movRes1 = await makeReq('GET', `/api/v1/inventory/movements?search=${challan1Number}`, adminAuth);
  const movements1 = movRes1.b.data!.movements as Array<{ type: string; quantity: number; referenceId: string }>;
  if (!movements1 || movements1.length < 2) {
    throw new Error(`Expected at least 2 OUT StockMovement audit records, got ${movements1?.length}`);
  }
  console.log(`✓ ${movements1.length} OUT StockMovements recorded referencing ${challan1Number}`);

  // ==========================================
  // TEST 2: Attempt confirm with insufficient stock (All or Nothing Transaction)
  // ==========================================
  console.log('\n--- TEST 2: Insufficient Stock Rollback (All or Nothing) ---');
  // ProdA has 30 available, ProdB has 20 available.
  // Request ProdA: 5 (sufficient), ProdB: 50 (INSUFFICIENT)
  const invalidChallanRes = await makeReq('POST', '/api/v1/challans', salesAuth, {
    customerId,
    items: [
      { productId: prodA.id, quantity: 5 },  // Sufficient (30 available)
      { productId: prodB.id, quantity: 50 }, // Insufficient (20 available)
    ],
  });
  const challan2Id = (invalidChallanRes.b.data!.challan as { id: string }).id;

  const confirm2Res = await makeReq('POST', `/api/v1/challans/${challan2Id}/confirm`, adminAuth);
  if (confirm2Res.s !== 400) {
    throw new Error(`Expected 400 for insufficient stock, got ${confirm2Res.s}: ${JSON.stringify(confirm2Res.b)}`);
  }
  if (confirm2Res.b.error?.code !== 'INSUFFICIENT_STOCK') {
    throw new Error(`Expected error code INSUFFICIENT_STOCK, got ${JSON.stringify(confirm2Res.b.error)}`);
  }
  console.log(`✓ Request rejected with 400 Bad Request: "${confirm2Res.b.message}"`);
  console.log(`✓ Error response details: ${JSON.stringify(confirm2Res.b.error)}`);

  // CRITICAL CHECK: Verify ZERO changes were made to ANY product in database
  const checkA2 = await makeReq('GET', `/api/v1/products/${prodA.id}`, adminAuth);
  const checkB2 = await makeReq('GET', `/api/v1/products/${prodB.id}`, adminAuth);
  const stockA2 = (checkA2.b.data!.product as { currentStock: number }).currentStock;
  const stockB2 = (checkB2.b.data!.product as { currentStock: number }).currentStock;

  if (stockA2 !== 30 || stockB2 !== 20) {
    throw new Error(`CORRUPTION DETECTED! Partial write occurred during failed transaction! ProdA=${stockA2}, ProdB=${stockB2}`);
  }
  console.log(`✓ ZERO WRITES VERIFIED: ProdA remains exactly ${stockA2}, ProdB remains exactly ${stockB2}`);

  // ==========================================
  // TEST 3: Attempt to confirm an already-CONFIRMED challan
  // ==========================================
  console.log('\n--- TEST 3: Prevent Double-Confirm on Confirmed Challan ---');
  const doubleConfirmRes = await makeReq('POST', `/api/v1/challans/${challan1Id}/confirm`, adminAuth);
  if (doubleConfirmRes.s !== 409) {
    throw new Error(`Expected 409 Conflict on double confirm, got ${doubleConfirmRes.s}: ${JSON.stringify(doubleConfirmRes.b)}`);
  }
  console.log(`✓ Double confirm rejected with 409 Conflict: "${doubleConfirmRes.b.message}"`);

  // Confirm stock was not double-deducted
  const checkA3 = await makeReq('GET', `/api/v1/products/${prodA.id}`, adminAuth);
  const stockA3 = (checkA3.b.data!.product as { currentStock: number }).currentStock;
  if (stockA3 !== 30) {
    throw new Error(`Double deduction occurred! Expected ProdA=30, got ${stockA3}`);
  }
  console.log(`✓ Stock integrity preserved: ProdA remains ${stockA3}`);

  // ==========================================
  // TEST 4: Cancel draft challan & Prevent Confirming Cancelled Challan
  // ==========================================
  console.log('\n--- TEST 4: Cancel Draft Challan & Prevent Confirming Cancelled ---');
  const draftToCancelRes = await makeReq('POST', '/api/v1/challans', salesAuth, {
    customerId,
    items: [{ productId: prodA.id, quantity: 2 }],
  });
  const challan3Id = (draftToCancelRes.b.data!.challan as { id: string }).id;

  const cancelRes = await makeReq('POST', `/api/v1/challans/${challan3Id}/cancel`, adminAuth);
  if (cancelRes.s !== 200) throw new Error(`Cancel failed: ${JSON.stringify(cancelRes.b)}`);
  const cancelledChallan = cancelRes.b.data!.challan as { status: string };
  if (cancelledChallan.status !== 'CANCELLED') throw new Error(`Expected status CANCELLED, got ${cancelledChallan.status}`);
  console.log('✓ Draft challan successfully cancelled.');

  // Attempt to confirm the cancelled challan
  const confirmCancelledRes = await makeReq('POST', `/api/v1/challans/${challan3Id}/confirm`, adminAuth);
  if (confirmCancelledRes.s !== 409) {
    throw new Error(`Expected 409 for confirming cancelled challan, got ${confirmCancelledRes.s}: ${JSON.stringify(confirmCancelledRes.b)}`);
  }
  console.log(`✓ Confirming CANCELLED challan rejected with 409 Conflict: "${confirmCancelledRes.b.message}"`);

  console.log('\n🎉 ALL CHALLAN CONFIRM/CANCEL TRANSACTION TESTS PASSED!\n');
}

testChallanTransactions().catch((err: Error) => {
  console.error('\n❌ Challan transaction test suite failed:', err.message);
  process.exit(1);
});
