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

async function testStockMovements() {
  console.log('\n🚀 Running Phase 9 Stock Movements & Transactions Test Suite...\n');

  // 1. Authenticate all 4 roles
  const [adminToken, warehouseToken, salesToken, accountsToken] = await Promise.all([
    login('admin@fundsroom.com', 'Admin@1234'),
    login('warehouse@fundsroom.com', 'Warehouse@1234'),
    login('sales@fundsroom.com', 'Sales@1234'),
    login('accounts@fundsroom.com', 'Accounts@1234'),
  ]);
  const adminAuth = { Authorization: `Bearer ${adminToken}` };
  const warehouseAuth = { Authorization: `Bearer ${warehouseToken}` };
  const salesAuth = { Authorization: `Bearer ${salesToken}` };
  const accountsAuth = { Authorization: `Bearer ${accountsToken}` };

  console.log('✓ All 4 roles authenticated successfully.');

  // 2. Create a test product with initial stock 20
  const timestamp = Date.now();
  const prodRes = await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: `Movement Test Product ${timestamp}`,
    sku: `SKU-MOV-${timestamp}`,
    category: 'Fabrics',
    unit: 'METERS',
    costPrice: 400,
    sellingPrice: 600,
    currentStock: 20,
    minStockAlert: 10,
  });
  if (prodRes.s !== 201) throw new Error(`Product creation failed: ${JSON.stringify(prodRes.b)}`);
  const productId = (prodRes.b.data.product as { id: string }).id;
  console.log(`✓ Test product created: ID=${productId} (Initial Stock: 20)`);

  // 3. Record an IN movement (+15 units)
  const inRes = await makeReq('POST', '/api/v1/inventory/movements', warehouseAuth, {
    productId,
    movementType: 'IN',
    quantity: 15,
    reason: 'Purchase shipment received from vendor',
    referenceId: 'PO-2026-001',
  });
  if (inRes.s !== 201) {
    throw new Error(`IN movement failed: ${JSON.stringify(inRes.b)}`);
  }
  const inProduct = inRes.b.data.product as { currentStock: number };
  const inMovement = inRes.b.data.movement as {
    previousStock: number;
    newStock: number;
    type: string;
    quantity: number;
  };
  if (inProduct.currentStock !== 35 || inMovement.previousStock !== 20 || inMovement.newStock !== 35) {
    throw new Error(`Stock mismatch on IN: product=${inProduct.currentStock}, movement=${inMovement.newStock}`);
  }
  console.log('✓ Recorded IN movement: +15 units (Stock: 20 -> 35): 201 OK');

  // 4. Record an OUT movement (-10 units)
  const outRes = await makeReq('POST', '/api/v1/inventory/movements', adminAuth, {
    productId,
    movementType: 'OUT',
    quantity: 10,
    reason: 'Direct counter wholesale dispatch',
    referenceId: 'DC-2026-001',
  });
  if (outRes.s !== 201) {
    throw new Error(`OUT movement failed: ${JSON.stringify(outRes.b)}`);
  }
  const outProduct = outRes.b.data.product as { currentStock: number };
  const outMovement = outRes.b.data.movement as {
    previousStock: number;
    newStock: number;
    quantity: number;
  };
  if (outProduct.currentStock !== 25 || outMovement.previousStock !== 35 || outMovement.newStock !== 25) {
    throw new Error(`Stock mismatch on OUT: product=${outProduct.currentStock}, movement=${outMovement.newStock}`);
  }
  console.log('✓ Recorded OUT movement: -10 units (Stock: 35 -> 25): 201 OK');

  // 5. Critical check: OUT movement that would go negative (-50 units when stock is 25)
  // MUST be rejected, stock MUST remain unchanged at 25
  const negativeRes = await makeReq('POST', '/api/v1/inventory/movements', warehouseAuth, {
    productId,
    movementType: 'OUT',
    quantity: 50,
    reason: 'Excessive dispatch attempt',
  });
  if (negativeRes.s !== 400) {
    throw new Error(`Expected 400 for negative stock attempt, got ${negativeRes.s}: ${JSON.stringify(negativeRes.b)}`);
  }
  console.log(`✓ Negative stock attempt rejected: 400 Bad Request ("${negativeRes.b.message}")`);

  // Verify product stock remains strictly unchanged at 25
  const checkProd = await makeReq('GET', `/api/v1/products/${productId}`, salesAuth);
  const currentCheckStock = (checkProd.b.data.product as { currentStock: number }).currentStock;
  if (currentCheckStock !== 25) {
    throw new Error(`Stock was modified during rejected transaction! Expected 25, got ${currentCheckStock}`);
  }
  console.log(`✓ Stock integrity confirmed: currentStock remains unchanged at ${currentCheckStock}`);

  // 6. Test GET /api/v1/inventory/movements
  const listRes = await makeReq('GET', `/api/v1/inventory/movements?productId=${productId}`, accountsAuth);
  if (listRes.s !== 200) {
    throw new Error(`Failed to query movements: ${JSON.stringify(listRes.b)}`);
  }
  const movements = listRes.b.data.movements as Array<{
    id: string;
    type: string;
    quantity: number;
    previousStock: number;
    newStock: number;
    user: { name: string; role: string };
  }>;
  if (!movements || movements.length < 2) {
    throw new Error(`Expected >= 2 movement audit logs, got ${movements?.length}`);
  }
  console.log(`✓ Movement audit log verified: ${movements.length} transactions with operator user details.`);

  // 7. Verify RBAC on POST /api/v1/inventory/movements
  const salesMovement = await makeReq('POST', '/api/v1/inventory/movements', salesAuth, {
    productId,
    movementType: 'IN',
    quantity: 5,
    reason: 'Sales attempt',
  });
  if (salesMovement.s !== 403) throw new Error(`Expected 403 for SALES stock movement, got ${salesMovement.s}`);
  console.log('✓ SALES blocked from executing manual stock movements: 403 Forbidden');

  const accountsMovement = await makeReq('POST', '/api/v1/inventory/movements', accountsAuth, {
    productId,
    movementType: 'IN',
    quantity: 5,
    reason: 'Accounts attempt',
  });
  if (accountsMovement.s !== 403) throw new Error(`Expected 403 for ACCOUNTS stock movement, got ${accountsMovement.s}`);
  console.log('✓ ACCOUNTS blocked from executing manual stock movements: 403 Forbidden');

  console.log('\n🎉 ALL STOCK MOVEMENT & TRANSACTION TESTS PASSED!\n');
}

testStockMovements().catch((err: Error) => {
  console.error('\n❌ Stock movement test suite failed:', err.message);
  process.exit(1);
});
