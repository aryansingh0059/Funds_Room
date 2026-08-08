import http from 'http';
import app from '../app';

let serverInstance: http.Server;

interface ApiResponseEnvelope<T = Record<string, unknown>> {
  success: boolean;
  message: string;
  data?: T;
  error?: unknown;
}

interface LoginResponseData {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    password?: string;
    passwordHash?: string;
  };
}

const makeRequest = <T = Record<string, unknown>>(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  body: unknown = null,
): Promise<{ status: number; body: ApiResponseEnvelope<T> }> => {
  return new Promise((resolve, reject) => {
    const jsonBody = body ? JSON.stringify(body) : null;
    const reqHeaders: Record<string, string> = {
      ...headers,
      ...(jsonBody
        ? {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(jsonBody).toString(),
          }
        : {}),
    };

    const req = http.request(
      {
        hostname: 'localhost',
        port: 5099,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            reject(new Error(`Failed to parse JSON response: ${rawData}`));
          }
        });
      },
    );

    req.on('error', (err) => reject(err));
    if (jsonBody) {
      req.write(jsonBody);
    }
    req.end();
  });
};

async function runAuthTests() {
  console.log('🚀 Starting Phase 3 Authentication Test Suite...');
  serverInstance = app.listen(5099);

  try {
    // 1. Test POST /api/v1/auth/login with valid admin credentials
    console.log('1. Testing POST /api/v1/auth/login with valid credentials...');
    const validLoginRes = await makeRequest<LoginResponseData>('POST', '/api/v1/auth/login', {}, {
      email: 'admin@fundsroom.com',
      password: 'Admin@1234',
    });

    if (validLoginRes.status !== 200 || !validLoginRes.body.success) {
      throw new Error(
        `Expected 200 success on valid login, got ${validLoginRes.status}: ${JSON.stringify(validLoginRes.body)}`,
      );
    }

    const token = validLoginRes.body.data?.token;
    const user = validLoginRes.body.data?.user;

    if (!token || typeof token !== 'string') {
      throw new Error('JWT token missing in login response');
    }

    if (!user || user.role !== 'ADMIN' || user.email !== 'admin@fundsroom.com') {
      throw new Error(`User payload incorrect: ${JSON.stringify(user)}`);
    }

    if ('password' in user || 'passwordHash' in user) {
      throw new Error('SECURITY VIOLATION: password field leaked in login response');
    }
    console.log('   ✓ Valid login passed! Token issued & user payload verified without password.');

    // 2. Test POST /api/v1/auth/login with WRONG password
    console.log('2. Testing POST /api/v1/auth/login with wrong password...');
    const wrongPassRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
      email: 'admin@fundsroom.com',
      password: 'WrongPassword999!',
    });

    if (wrongPassRes.status !== 401 || wrongPassRes.body.success !== false) {
      throw new Error(
        `Expected 401 on wrong password, got ${wrongPassRes.status}: ${JSON.stringify(wrongPassRes.body)}`,
      );
    }
    console.log('   ✓ Wrong password correctly rejected with 401 Unauthorized.');

    // 3. Test POST /api/v1/auth/login with NON-EXISTENT email
    console.log('3. Testing POST /api/v1/auth/login with non-existent email...');
    const nonExistentRes = await makeRequest('POST', '/api/v1/auth/login', {}, {
      email: 'ghost@fundsroom.com',
      password: 'SomePassword123',
    });

    if (nonExistentRes.status !== 401 || nonExistentRes.body.success !== false) {
      throw new Error(`Expected 401 on non-existent email, got ${nonExistentRes.status}`);
    }
    console.log('   ✓ Non-existent user correctly rejected with 401 Unauthorized.');

    // 4. Test GET /api/v1/auth/me MISSING token
    console.log('4. Testing GET /api/v1/auth/me with missing Authorization header...');
    const missingTokenRes = await makeRequest('GET', '/api/v1/auth/me');

    if (missingTokenRes.status !== 401 || missingTokenRes.body.success !== false) {
      throw new Error(`Expected 401 on missing token, got ${missingTokenRes.status}`);
    }
    console.log('   ✓ Missing token correctly rejected with 401 Unauthorized.');

    // 5. Test GET /api/v1/auth/me INVALID / TAMPERED token
    console.log('5. Testing GET /api/v1/auth/me with invalid token...');
    const invalidTokenRes = await makeRequest('GET', '/api/v1/auth/me', {
      Authorization: 'Bearer invalid.tampered.token',
    });

    if (invalidTokenRes.status !== 401 || invalidTokenRes.body.success !== false) {
      throw new Error(`Expected 401 on invalid token, got ${invalidTokenRes.status}`);
    }
    console.log('   ✓ Invalid token correctly rejected with 401 Unauthorized.');

    // 6. Test GET /api/v1/auth/me with VALID Bearer token
    console.log('6. Testing GET /api/v1/auth/me with valid Bearer token...');
    const meRes = await makeRequest<LoginResponseData>('GET', '/api/v1/auth/me', {
      Authorization: `Bearer ${token}`,
    });

    if (meRes.status !== 200 || !meRes.body.success) {
      throw new Error(
        `Expected 200 on /me with valid token, got ${meRes.status}: ${JSON.stringify(meRes.body)}`,
      );
    }

    const meUser = meRes.body.data?.user;
    if (!meUser || meUser.email !== 'admin@fundsroom.com' || meUser.role !== 'ADMIN') {
      throw new Error(`Invalid user returned from /me: ${JSON.stringify(meUser)}`);
    }

    if ('password' in meUser || 'passwordHash' in meUser) {
      throw new Error('SECURITY VIOLATION: password field leaked in /me response');
    }
    console.log('   ✓ GET /me passed! Returned authenticated user without password.');

    // 7. Verify all remaining 3 roles (SALES, WAREHOUSE, ACCOUNTS)
    console.log('7. Testing login for remaining roles (SALES, WAREHOUSE, ACCOUNTS)...');
    const roleTests = [
      { email: 'sales@fundsroom.com', pass: 'Sales@1234', expectedRole: 'SALES' },
      { email: 'warehouse@fundsroom.com', pass: 'Warehouse@1234', expectedRole: 'WAREHOUSE' },
      { email: 'accounts@fundsroom.com', pass: 'Accounts@1234', expectedRole: 'ACCOUNTS' },
    ];

    for (const rt of roleTests) {
      const rRes = await makeRequest<LoginResponseData>('POST', '/api/v1/auth/login', {}, {
        email: rt.email,
        password: rt.pass,
      });

      if (rRes.status !== 200 || rRes.body.data?.user?.role !== rt.expectedRole) {
        throw new Error(`Failed login for role ${rt.expectedRole}`);
      }
      console.log(`   ✓ Role login verified for ${rt.expectedRole}`);
    }

    console.log('🎉 ALL AUTHENTICATION TESTS PASSED WITH 100% SUCCESS!');
  } finally {
    serverInstance.close();
  }
}

runAuthTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  if (serverInstance) serverInstance.close();
  process.exit(1);
});
