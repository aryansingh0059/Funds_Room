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

async function testProducts() {
  console.log('\n🚀 Running Phase 7 Product Management Test Suite...\n');

  // 1. Authenticate all roles
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

  // 2. Create product as WAREHOUSE
  const uniqueSku = `SKU-TEST-${Date.now()}`;
  const createRes = await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: 'Industrial Cotton Roll 60gsm',
    sku: uniqueSku,
    category: 'Textiles',
    unit: 'ROLLS',
    costPrice: 4500,
    sellingPrice: 6200,
    currentStock: 25,
    minStockAlert: 10,
    description: 'High-tensile industrial cotton fabrics for garment distribution.',
  });
  if (createRes.s !== 201) {
    throw new Error(`Failed to create product: ${JSON.stringify(createRes.b)}`);
  }
  const createdProd = createRes.b.data.product as { id: string; sku: string; name: string };
  const prodId = createdProd.id;
  console.log(`✓ Product created successfully: ID=${prodId} SKU=${createdProd.sku}`);

  // 3. Duplicate SKU should return 409 CONFLICT with clear message
  const duplicateRes = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: 'Duplicate SKU Attempt',
    sku: uniqueSku,
    costPrice: 100,
    sellingPrice: 150,
  });
  if (duplicateRes.s !== 409) {
    throw new Error(`Expected 409 for duplicate SKU, got ${duplicateRes.s}: ${JSON.stringify(duplicateRes.b)}`);
  }
  console.log(`✓ Duplicate SKU returned 409 Conflict: "${duplicateRes.b.message}"`);

  // 4. Validate unitPrice/sellingPrice >= 0, currentStock >= 0, minStockAlert >= 0
  const invalidPriceRes = await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: 'Negative Price Product',
    sku: `SKU-NEG-${Date.now()}`,
    costPrice: -50,
    sellingPrice: -10,
  });
  if (invalidPriceRes.s !== 400) {
    throw new Error(`Expected 400 for negative price, got ${invalidPriceRes.s}`);
  }
  console.log('✓ Negative price rejected: 400 Bad Request');

  const invalidStockRes = await makeReq('POST', '/api/v1/products', warehouseAuth, {
    name: 'Negative Stock Product',
    sku: `SKU-STK-${Date.now()}`,
    costPrice: 100,
    sellingPrice: 150,
    currentStock: -5,
  });
  if (invalidStockRes.s !== 400) {
    throw new Error(`Expected 400 for negative stock, got ${invalidStockRes.s}`);
  }
  console.log('✓ Negative stock rejected: 400 Bad Request');

  // 5. Create low-stock product and normal product
  const lowStockSku = `SKU-LOW-${Date.now()}`;
  const lowStockRes = await makeReq('POST', '/api/v1/products', adminAuth, {
    name: 'Low Stock Silk Yarn',
    sku: lowStockSku,
    category: 'Yarn',
    unit: 'KG',
    costPrice: 800,
    sellingPrice: 1200,
    currentStock: 3,
    minStockAlert: 10,
  });
  if (lowStockRes.s !== 201) throw new Error('Failed to create low-stock product');
  console.log('✓ Created low-stock product (Stock=3, Alert=10)');

  // 6. Test lowStock filter
  const lowStockQueryRes = await makeReq('GET', '/api/v1/products?lowStock=true', salesAuth);
  const lowStockProducts = lowStockQueryRes.b.data.products as Array<{
    id: string;
    currentStock: number;
    minStockAlert: number;
  }>;
  if (lowStockQueryRes.s !== 200 || !Array.isArray(lowStockProducts)) {
    throw new Error(`Failed to query low stock products: ${JSON.stringify(lowStockQueryRes.b)}`);
  }
  const allAreLowStock = lowStockProducts.every((p) => p.currentStock <= p.minStockAlert);
  if (!allAreLowStock || lowStockProducts.length === 0) {
    throw new Error(`Low stock filter failed: found ${lowStockProducts.length} items`);
  }
  console.log(`✓ Low-stock filter verified: returned ${lowStockProducts.length} items where currentStock <= minStockAlert`);

  // 7. Test Search & Category filter
  const searchRes = await makeReq('GET', `/api/v1/products?search=${uniqueSku}`, accountsAuth);
  const searchProducts = searchRes.b.data.products as Array<{ sku: string }>;
  if (searchRes.s !== 200 || searchProducts.length !== 1 || searchProducts[0].sku !== uniqueSku) {
    throw new Error(`Search by SKU failed: ${JSON.stringify(searchRes.b)}`);
  }
  console.log('✓ Search by SKU verified');

  const catRes = await makeReq('GET', '/api/v1/products?category=Textiles', salesAuth);
  if (catRes.s !== 200) throw new Error('Category filter failed');
  console.log('✓ Category filter verified');

  // 8. Test Product Update
  const updateRes = await makeReq('PATCH', `/api/v1/products/${prodId}`, warehouseAuth, {
    sellingPrice: 6500,
    minStockAlert: 15,
  });
  if (updateRes.s !== 200) throw new Error(`Product update failed: ${JSON.stringify(updateRes.b)}`);
  console.log('✓ Product updated successfully (sellingPrice & minStockAlert)');

  // 9. RBAC Enforcement
  const salesCreateRes = await makeReq('POST', '/api/v1/products', salesAuth, {
    name: 'Sales Attempt',
    sku: `SKU-SALES-${Date.now()}`,
    costPrice: 10,
    sellingPrice: 20,
  });
  if (salesCreateRes.s !== 403) throw new Error(`Expected 403 for SALES product creation, got ${salesCreateRes.s}`);
  console.log('✓ SALES blocked from creating products: 403 Forbidden');

  const accountsCreateRes = await makeReq('POST', '/api/v1/products', accountsAuth, {
    name: 'Accounts Attempt',
    sku: `SKU-ACC-${Date.now()}`,
    costPrice: 10,
    sellingPrice: 20,
  });
  if (accountsCreateRes.s !== 403) {
    throw new Error(`Expected 403 for ACCOUNTS product creation, got ${accountsCreateRes.s}`);
  }
  console.log('✓ ACCOUNTS blocked from creating products: 403 Forbidden');

  console.log('\n🎉 ALL PRODUCT MANAGEMENT TESTS PASSED!\n');
}

testProducts().catch((err: Error) => {
  console.error('\n❌ Product test suite failed:', err.message);
  process.exit(1);
});
