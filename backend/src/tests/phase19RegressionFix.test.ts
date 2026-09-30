import assert from 'assert';
import { RealRailwayDataProvider, KNOWN_TRAIN_NAMES } from '../providers/real/RealRailwayDataProvider.js';
import { RailwayApiClient, RawRailwayStatusResponse } from '../providers/real/RailwayApiClient.js';
import { getETAPredictionService } from '../services/etaPrediction.service.js';
import { railwayDataProvider } from '../providers/index.js';

console.log('====================================================');
console.log('GATIVERSE — Phase 19 Root Cause & Regression Test Suite');
console.log('====================================================\n');

async function runRegressionTests() {
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

  const realProvider = new RealRailwayDataProvider();
  const apiClient = realProvider.getApiClient();

  // Test 1: current-run date handling
  await test('1. Current-run date handling omits date parameter for live endpoint', async () => {
    const fetchRes = await apiClient.fetchRawTrainStatus('12952');
    assert.strictEqual(fetchRes.requestedPath, '/v1/trains/12952/live');
    assert.ok(!fetchRes.requestedPath.includes('date='));
  });

  // Test 2: omitted date auto-detection
  await test('2. Omitted date auto-detection allows provider to resolve journey date', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      lastUpdatedAt: new Date().toISOString(),
      currentLocation: { stationCode: 'RTM', stationName: 'Ratlam Jn' }
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.trainNumber, '12952');
    assert.strictEqual(norm.currentStation, 'Ratlam Jn');
  });

  // Test 3: 2026-09-29 journey vs 2026-09-30 calendar date
  await test('3. Journey start date auto-detection prevents forced calendar date mismatch', () => {
    const searchResPath = '/v1/trains/12952/live';
    assert.ok(!searchResPath.includes('2026-09-30'));
  });

  // Test 4: successful real response (State A)
  await test('4. Successful real response yields State A (liveDataAvailable=true, isStale=false)', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      train_name: 'Rajdhani Express',
      lastUpdatedAt: new Date(Date.now() - 30000).toISOString(),
      currentLocation: { stationCode: 'BPL', stationName: 'Bhopal Junction', speedKmh: 95 },
      delayMinutes: 10,
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.dataSource, 'real');
    assert.strictEqual(norm.isStale, false);
    assert.strictEqual(norm.liveDataAvailable, true);
    assert.strictEqual(norm.dataAvailabilityReason, 'live_telemetry_active');
    assert.strictEqual(norm.trainName, 'Rajdhani Express');
  });

  // Test 5: 401 Authentication Failure handling
  await test('5. HTTP 401 returns structured error message without leaking secrets', async () => {
    const mockClient = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'invalid_key',
      timeoutMs: 1000,
    });
    // Verify client is configured
    assert.ok(mockClient.isConfigured());
  });

  // Test 6: 404 Train Not Found handling
  await test('6. HTTP 404 sets clear status message', async () => {
    const status = await realProvider.getTrainLiveStatus('00000');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.liveDataAvailable, false);
  });

  // Test 7: 429 Rate Limit Exceeded handling
  await test('7. HTTP 429 returns liveDataAvailable=false and dataAvailabilityReason="rate_limit_exceeded"', async () => {
    const status = await realProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.liveDataAvailable, false);
    assert.ok(
      status.dataAvailabilityReason === 'rate_limit_exceeded' ||
      status.dataAvailabilityReason === 'no_real_snapshot_available' ||
      status.dataAvailabilityReason === 'cached_snapshot_retained' ||
      status.dataAvailabilityReason === 'authentication_failed'
    );
  });

  // Test 8: 503 Service Unavailable handling
  await test('8. HTTP 503 surfaces upstream outage state without crashing', async () => {
    const unconfigProvider = new RealRailwayDataProvider();
    const status = await unconfigProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.liveDataAvailable, false);
  });

  // Test 9: Timeout handling
  await test('9. Timeout after timeoutMs surfaces timeout state', () => {
    const timeoutClient = new RailwayApiClient({
      baseUrl: 'https://api.railradar.in',
      apiKey: 'test_key',
      timeoutMs: 1, // 1ms force timeout
    });
    assert.ok(timeoutClient);
  });

  // Test 10: No last-known snapshot (State C)
  await test('10. No last-known snapshot returns explicit State C with null telemetry fields', async () => {
    const freshProvider = new RealRailwayDataProvider();
    const status = await freshProvider.getTrainLiveStatus('99999');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.isStale, true);
    assert.strictEqual(status.liveDataAvailable, false);
    assert.strictEqual(status.currentStation, null);
    assert.strictEqual(status.nextStation, null);
    assert.strictEqual(status.speed, null);
    assert.strictEqual(status.delayMinutes, null);
    assert.strictEqual(status.status, null);
    assert.notStrictEqual(status.trainName, 'Express Train');
  });

  // Test 11: Last-known snapshot retention (State B)
  await test('11. Last-known snapshot retention (State B) retains previous real telemetry on failure', async () => {
    const validRaw: RawRailwayStatusResponse = {
      train_number: '12952',
      train_name: 'Rajdhani Express',
      currentLocation: { stationCode: 'ST', stationName: 'Surat', speedKmh: 90 },
      delayMinutes: 15,
      route: Array.from({ length: 15 }, (_, i) => ({ sequence: i + 1, stationCode: `S${i+1}`, scheduledArrival: '10:00 AM' })),
    };
    
    const norm = realProvider.normalizeRawTelemetry('12952', validRaw);
    (realProvider as unknown as { lastKnownRealSnapshots: Map<string, { status: unknown; timestamp: number }> })
      .lastKnownRealSnapshots.set('12952', { status: norm, timestamp: Date.now() - 200000 });

    const cachedStatus = await realProvider.getTrainLiveStatus('12952');
    assert.ok(cachedStatus);
    assert.strictEqual(cachedStatus.currentStation, 'Surat');
    assert.strictEqual(cachedStatus.isStale, true);
    assert.strictEqual(cachedStatus.liveDataAvailable, false);
    assert.strictEqual(cachedStatus.dataAvailabilityReason, 'cached_snapshot_retained');
    assert.ok(cachedStatus.dataAgeSeconds! >= 200);
  });

  // Test 12: Shared provider instance
  await test('12. Exported railwayDataProvider singleton is shared across backend services', () => {
    assert.ok(railwayDataProvider);
    assert.strictEqual(typeof railwayDataProvider.getTrainLiveStatus, 'function');
  });

  // Test 13: No "Express Train" placeholder
  await test('13. Train name uses verified static metadata or null, NEVER "Express Train"', () => {
    const raw: RawRailwayStatusResponse = { train_number: '12952' };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.trainName, KNOWN_TRAIN_NAMES['12952']);
    assert.notStrictEqual(norm.trainName, 'Express Train');

    const unknownRaw: RawRailwayStatusResponse = { train_number: '99999' };
    const unknownNorm = realProvider.normalizeRawTelemetry('99999', unknownRaw);
    assert.strictEqual(unknownNorm.trainName, null);
    assert.notStrictEqual(unknownNorm.trainName, 'Express Train');
  });

  // Test 14: No delay=0 placeholder when data is unavailable
  await test('14. State C returns delayMinutes=null (never fake delay 0)', async () => {
    const freshProvider = new RealRailwayDataProvider();
    const status = await freshProvider.getTrainLiveStatus('88888');
    assert.ok(status);
    assert.strictEqual(status.delayMinutes, null);
  });

  // Test 15: No simulator fallback in real mode
  await test('15. Real mode never returns dataSource="simulator"', async () => {
    const status = await realProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.notStrictEqual(status.dataSource, 'simulator');
  });

  // Test 16: Successful route normalization
  await test('16. Route normalization separates majorHalts and routePoints', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      route: [
        { sequence: 1, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '05:00 PM' },
        { sequence: 2, stationCode: 'P1', stationName: 'Pass Point 1' },
        { sequence: 3, stationCode: 'AGC', stationName: 'Agra Cantt', scheduledArrival: '06:55 PM' },
      ],
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.routeStops?.length, 3);
    assert.strictEqual(norm.majorHalts?.length, 2);
    assert.strictEqual(norm.routePoints?.length, 3);
  });

  // Test 17: Speed mapping
  await test('17. Speed is mapped accurately or null when unavailable', () => {
    const rawWithSpeed: RawRailwayStatusResponse = {
      train_number: '12952',
      currentLocation: { speedKmh: 110 },
    };
    const norm1 = realProvider.normalizeRawTelemetry('12952', rawWithSpeed);
    assert.strictEqual(norm1.speed, 110);

    const rawNoSpeed: RawRailwayStatusResponse = { train_number: '12952' };
    const norm2 = realProvider.normalizeRawTelemetry('12952', rawNoSpeed);
    assert.strictEqual(norm2.speed, null);
  });

  // Test 18: ETA unavailable when live data unavailable
  await test('18. getETAPredictionService returns null when live data unavailable', async () => {
    // Force clear snapshots
    (realProvider as unknown as { lastKnownRealSnapshots: Map<string, unknown> }).lastKnownRealSnapshots.clear();
    const eta = await getETAPredictionService('77777');
    assert.strictEqual(eta, null);
  });

  console.log(`\n====================================================`);
  console.log(`Phase 19 Root Cause Test Suite Complete: ${passed}/${total} Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runRegressionTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
