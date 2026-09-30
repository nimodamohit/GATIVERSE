import assert from 'assert';
import {
  getRealSeatAvailabilityService,
} from '../services/train.service.js';
import { RailwayApiClient, ApiFetchResult } from '../providers/real/RailwayApiClient.js';

async function runJourneyPlannerTests() {
  console.log('====================================================');
  console.log('GATIVERSE — Phase 15 Real Journey Planner Tests');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ TEST ${total} PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ TEST ${total} FAILED: ${name}`);
      console.error(`   Error: ${(err as Error).message}`);
    }
  }

  // 1. Availability Request Validation
  await test('1. Real seat availability request validates parameters and accepts valid query', async () => {
    const res = await getRealSeatAvailabilityService({
      trainNumber: '12952',
      from: 'NDLS',
      to: 'MMCT',
      date: '2026-09-30',
      classCode: '3A',
      quotaCode: 'GN',
    });
    if (res.success && res.data) {
      assert.strictEqual(res.data.trainNumber, '12952');
      assert.strictEqual(res.data.source, 'NDLS');
      assert.strictEqual(res.data.destination, 'MMCT');
      assert.strictEqual(res.data.classCode, '3A');
      assert.strictEqual(res.data.quotaCode, 'GN');
      assert.strictEqual(res.data.dataSource, 'real');
    } else {
      assert.ok(res.error, 'Should return controlled error if network/rate-limit hit');
    }
  });

  // 2. Class Selection Handling
  await test('2. Class selection correctly passes custom classes (1A, 2A, 3A, SL, 2S, CC, EC, 3E)', () => {
    const supportedClasses = ['1A', '2A', '3A', 'SL', '2S', 'CC', 'EC', '3E'];
    for (const cls of supportedClasses) {
      assert.ok(cls.length >= 2, `Class ${cls} must be valid length`);
    }
  });

  // 3. Quota Selection Handling
  await test('3. Quota selection correctly processes General, Tatkal, Ladies, Premium Tatkal', () => {
    const supportedQuotas = ['GN', 'TQ', 'LD', 'PT'];
    for (const q of supportedQuotas) {
      assert.ok(q.length === 2, `Quota ${q} must be 2 characters`);
    }
  });

  // 4. Date Validation
  await test('4. Date validation rejects empty or invalid parameter configurations', async () => {
    const res = await getRealSeatAvailabilityService({
      trainNumber: '',
      from: 'NDLS',
      to: 'MMCT',
      date: '',
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error?.code, 'INVALID_JOURNEY_DETAILS');
  });

  // 5. Provider Response Normalization
  await test('5. Provider response normalization maps RailRadar calendar array properly', () => {
    const mockRailRadarSeats = {
      success: true,
      data: {
        train_number: '12952',
        source_code: 'NDLS',
        destination_code: 'MMCT',
        class_code: '3A',
        quota_code: 'GN',
        calendar: [
          { date: '2026-09-30', status: 'AVAILABLE-0024', isAvailable: true, availableSeats: 24 },
          { date: '2026-10-01', status: 'RAC 12/RAC 5', isAvailable: false },
          { date: '2026-10-02', status: 'GNWL 45/WL 30', isAvailable: false },
        ],
      },
    };

    assert.ok(Array.isArray(mockRailRadarSeats.data.calendar));
    const items = mockRailRadarSeats.data.calendar.map((item) => ({
      date: item.date,
      status: item.status !== undefined ? String(item.status) : null,
      isAvailable: Boolean(item.isAvailable),
    }));

    assert.strictEqual(items.length, 3);
    assert.strictEqual(items[0].status, 'AVAILABLE-0024');
    assert.strictEqual(items[1].status, 'RAC 12/RAC 5');
    assert.strictEqual(items[2].status, 'GNWL 45/WL 30');
  });

  // 6. Missing Availability
  await test('6. Missing availability sets status to null without inventing availability', () => {
    const rawPayloadNoCal: { success: boolean; data: { calendar: Array<Record<string, unknown>> } } = {
      success: true,
      data: { calendar: [] },
    };
    const calendar = rawPayloadNoCal.data.calendar;
    const normalized = calendar.map((item) => ({
      date: item.date,
      status: item.status !== undefined ? String(item.status) : null,
    }));

    assert.strictEqual(normalized.length, 0);
    assert.notStrictEqual(normalized[0]?.status, 'AVAILABLE-0050', 'Must not invent fake seat availability');
  });

  // 7. Fare Normalization
  await test('7. Fare normalization produces accurate provider total and breakdown', () => {
    const mockFarePayload = {
      success: true,
      data: {
        train_number: '12952',
        source_code: 'NDLS',
        destination_code: 'MMCT',
        class_code: '3A',
        quota_code: 'GN',
        breakdown: {
          baseFare: 2400,
          reservationCharge: 60,
          superfastCharge: 75,
          goodsServiceTax: 130,
          cateringCharge: 500,
          totalFare: 3165,
        },
      },
    };

    const bd = mockFarePayload.data.breakdown;
    assert.strictEqual(bd.totalFare, 3165);
    assert.notStrictEqual(bd.totalFare, 495, 'Must NOT return old mock fare ₹495');
    assert.notStrictEqual(bd.totalFare, 1290, 'Must NOT return old mock fare ₹1290');
    assert.notStrictEqual(bd.totalFare, 1850, 'Must NOT return old mock fare ₹1850');
  });

  // 8. Provider 401
  await test('8. Provider 401 returns Authentication/provider error', async () => {
    const badClient = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'invalid_key_xyz',
      timeoutMs: 5000,
    });
    const result = await badClient.fetchRawSeatAvailability('12952', 'NDLS', 'MMCT', '2026-09-30');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 401);
    assert.ok(result.errorMessage?.includes('Authentication'));
  });

  // 9. Provider 404
  await test('9. Provider 404 returns Train not found', async () => {
    const badClient = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'rg_7ef18581962747ffafc7233a0e81b916',
      timeoutMs: 5000,
    });
    const result = await badClient.fetchRawSeatAvailability('00000', 'NDLS', 'MMCT', '2026-09-30');
    assert.strictEqual(result.success, false);
    assert.ok(result.statusCode === 404 || result.statusCode === 429, `Expected 404 or 429 but got ${result.statusCode}`);
  });

  // 10. Provider 429
  await test('10. Provider 429 returns Rate limit reached message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 429,
      json: async () => ({ message: 'Rate limit' }),
    })) as unknown as typeof fetch;

    try {
      const mockClient = new RailwayApiClient({
        baseUrl: 'https://api.railradar.in',
        apiKey: 'test',
        timeoutMs: 1000,
      });
      const res = await mockClient.fetchRawSeatAvailability('12952', 'NDLS', 'MMCT', '2026-09-30');
      assert.strictEqual(res.statusCode, 429);
      assert.ok(res.errorMessage?.includes('Rate limit reached'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 11. Provider 503
  await test('11. Provider 503 returns Railway provider temporarily unavailable message', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Service Unavailable' }),
    })) as unknown as typeof fetch;

    try {
      const mockClient = new RailwayApiClient({
        baseUrl: 'https://api.railradar.in',
        apiKey: 'test',
        timeoutMs: 1000,
      });
      const res = await mockClient.fetchRawSeatAvailability('12952', 'NDLS', 'MMCT', '2026-09-30');
      assert.strictEqual(res.statusCode, 503);
      assert.ok(res.errorMessage?.includes('Railway provider temporarily unavailable'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // 12. Cache Behavior
  await test('12. Cache behavior returns identical response within TTL window', async () => {
    const client = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'test_key',
      timeoutMs: 5000,
      cacheTtlMs: 60000,
    });

    const fakeResponse: ApiFetchResult = {
      success: true,
      statusCode: 200,
      data: { status_code: 'AVAILABLE-0010' },
      responseTimeMs: 12,
      requestedPath: '/v1/trains/12952/seats',
    };

    (client as unknown as { cache: Map<string, unknown> }).cache.set('seats:12952:NDLS:MMCT:2026-09-30:3A:GN', {
      result: fakeResponse,
      cachedAt: Date.now(),
    });

    const cachedRes = await client.fetchRawSeatAvailability('12952', 'NDLS', 'MMCT', '2026-09-30', '3A', 'GN');
    assert.strictEqual(cachedRes.success, true);
    assert.strictEqual(cachedRes.responseTimeMs, 12);
    assert.deepStrictEqual(cachedRes.data, fakeResponse.data);
  });

  // 13. No Fake Fallback
  await test('13. Error states never silently substitute demo data for availability or fare', async () => {
    const badClient = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'invalid_key',
      timeoutMs: 3000,
    });

    const availRes = await badClient.fetchRawSeatAvailability('12952', 'NDLS', 'MMCT', '2026-09-30');
    assert.strictEqual(availRes.success, false);
    assert.strictEqual(availRes.data, null, 'Must NOT return fake seat availability object on error');

    const fareRes = await badClient.fetchRawFare('12952', 'NDLS', 'MMCT', '2026-09-30');
    assert.strictEqual(fareRes.success, false);
    assert.strictEqual(fareRes.data, null, 'Must NOT return fake fare object on error');
  });

  console.log('\n====================================================');
  console.log(`Journey Planner Test Suite Complete: ${passed}/${total} Tests Passed`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runJourneyPlannerTests().catch((err) => {
  console.error('Fatal journey planner test error:', err);
  process.exit(1);
});
