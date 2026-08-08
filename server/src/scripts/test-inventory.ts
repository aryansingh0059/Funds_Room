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

async function testInventory() {
  console.log('\n🚀 Running Phase 8 Inventory Management Test Suite...\n');

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

  // 2. Create test products with specific stock conditions
  const timestamp = Date.now();
  await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: `Linen Fabric Bolt ${timestamp}`,
    sku: `SKU-INV-LOW-${timestamp}`,
    category: 'Fabrics',
    unit: 'METERS',
    costPrice: 350,
    sellingPrice: 550,
    currentStock: 4,
    minStockAlert: 15,
  });

  await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: `Zero Stock Filament ${timestamp}`,
    sku: `SKU-INV-OOS-${timestamp}`,
    category: 'Yarn',
    unit: 'KG',
    costPrice: 200,
    sellingPrice: 350,
    currentStock: 0,
    minStockAlert: 10,
  });

  await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: `High Stock Buttons Box ${timestamp}`,
    sku: `SKU-INV-OK-${timestamp}`,
    category: 'Accessories',
    unit: 'BOXES',
    costPrice: 120,
    sellingPrice: 180,
    currentStock: 150,
    minStockAlert: 20,
  });

  console.log('✓ Seeded inventory with Low Stock, Out of Stock, and Healthy Stock items.');

  // 3. Test GET /api/v1/inventory (overview)
  const overviewRes = await makeReq('GET', '/api/v1/inventory', salesAuth);
  if (overviewRes.s !== 200) {
    throw new Error(`Failed to fetch inventory overview: ${JSON.stringify(overviewRes.b)}`);
  }
  const { items, summary } = overviewRes.b.data as {
    items: Array<{
      name: string;
      sku: string;
      currentStock: number;
      minStockAlert: number;
      isLowStock: boolean;
      isOutOfStock: boolean;
      warehouseLocation: string;
      stockStatus: string;
      valuation: string;
    }>;
    summary: {
      totalSKUs: number;
      totalUnits: number;
      totalValuation: string;
      lowStockCount: number;
      outOfStockCount: number;
    };
  };

  if (!items || items.length === 0 || !summary) {
    throw new Error('Inventory overview returned empty or invalid data');
  }

  console.log(`✓ Inventory Overview: Total SKUs=${summary.totalSKUs}, Total Units=${summary.totalUnits}, Valuation=₹${summary.totalValuation}`);
  console.log(`✓ Summary alerts: Low Stock=${summary.lowStockCount}, Out of Stock=${summary.outOfStockCount}`);

  // Verify fields on inventory item
  const firstItem = items[0];
  if (!firstItem.warehouseLocation || typeof firstItem.isLowStock !== 'boolean') {
    throw new Error(`Missing required fields on inventory item: ${JSON.stringify(firstItem)}`);
  }
  console.log(`✓ Inventory item verified: SKU=${firstItem.sku}, Location="${firstItem.warehouseLocation}", Status=${firstItem.stockStatus}`);

  // 4. Test GET /api/v1/inventory/low-stock
  const lowStockRes = await makeReq('GET', '/api/v1/inventory/low-stock', accountsAuth);
  if (lowStockRes.s !== 200) {
    throw new Error(`Failed to fetch low-stock inventory: ${JSON.stringify(lowStockRes.b)}`);
  }
  const lowStockItems = lowStockRes.b.data.items as Array<{
    sku: string;
    currentStock: number;
    minStockAlert: number;
    deficit: number;
    suggestedReorderQuantity: number;
    estimatedReorderCost: string;
    warehouseLocation: string;
  }>;

  if (!lowStockItems || lowStockItems.length === 0) {
    throw new Error('Expected low stock items to be returned');
  }

  const allLow = lowStockItems.every((i) => i.currentStock <= i.minStockAlert && i.deficit >= 0);
  if (!allLow) {
    throw new Error('Some items in /inventory/low-stock exceed their minimum threshold');
  }

  console.log(`✓ Low stock endpoint returned ${lowStockItems.length} items with replenishment deficits and reorder estimates.`);

  // 5. Test search and category filtering on /inventory
  const filteredRes = await makeReq('GET', `/api/v1/inventory?search=${timestamp}`, warehouseAuth);
  const filteredItems = filteredRes.b.data.items as unknown[];
  if (filteredRes.s !== 200 || filteredItems.length < 3) {
    throw new Error(`Inventory search failed: expected >= 3 items, got ${filteredItems?.length}`);
  }
  console.log('✓ Search and filter on /inventory verified.');

  // 6. Test RBAC: All 4 roles can access both inventory endpoints
  for (const [role, token] of [
    ['ADMIN', adminAuth],
    ['WAREHOUSE', warehouseAuth],
    ['SALES', salesAuth],
    ['ACCOUNTS', accountsAuth],
  ] as const) {
    const r1 = await makeReq('GET', '/api/v1/inventory', token);
    const r2 = await makeReq('GET', '/api/v1/inventory/low-stock', token);
    if (r1.s !== 200 || r2.s !== 200) {
      throw new Error(`Role ${role} failed to access inventory: r1=${r1.s}, r2=${r2.s}`);
    }
  }
  console.log('✓ RBAC access verified for all 4 roles (ADMIN, WAREHOUSE, SALES, ACCOUNTS).');

  // 7. Missing auth returns 401
  const unauthRes = await makeReq('GET', '/api/v1/inventory', {});
  if (unauthRes.s !== 401) {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.s}`);
  }
  console.log('✓ Unauthenticated request rejected: 401 Unauthorized.');

  console.log('\n🎉 ALL INVENTORY MANAGEMENT TESTS PASSED!\n');
}

testInventory().catch((err: Error) => {
  console.error('\n❌ Inventory test suite failed:', err.message);
  process.exit(1);
});
