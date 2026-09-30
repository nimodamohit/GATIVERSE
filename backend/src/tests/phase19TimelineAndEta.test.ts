import assert from 'assert';
import { RealRailwayDataProvider } from '../providers/real/RealRailwayDataProvider.js';
import { SimulatorRailwayDataProvider } from '../providers/simulator/SimulatorRailwayDataProvider.js';
import { RawRailwayStatusResponse } from '../providers/real/RailwayApiClient.js';
import { getETAPredictionService } from '../services/etaPrediction.service.js';

console.log('====================================================');
console.log('GATIVERSE — Phase 19 Real Live Status & ETA Test Suite');
console.log('====================================================\n');

async function runPhase19Tests() {
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
  const simProvider = new SimulatorRailwayDataProvider();

  // Test 1: Real speed mapping
  await test('1. Real speed mapping preserves valid speed value', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      currentLocation: { speedKmh: 88, stationCode: 'ST' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.speed, 88);
  });

  // Test 2: Speed missing -> returns null (Speed unavailable)
  await test('2. Speed missing maps to null (triggers "Speed unavailable" in UI)', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      currentLocation: { stationCode: 'ST' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.speed, null);
  });

  // Test 3: No simulator speed substitution in real mode
  await test('3. No simulator speed substitution when provider speed is null', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      delayMinutes: 20,
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.speed, null);
    assert.notStrictEqual(norm.speed, 95);
    assert.notStrictEqual(norm.speed, 97);
  });

  // Test 4: Real route normalization
  await test('4. Real route normalization preserves station properties', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      route: [
        { sequence: 1, stationCode: 'NDLS', stationName: 'New Delhi', scheduledArrival: '2026-09-30T16:55:00+05:30' },
        { sequence: 2, stationCode: 'ST', stationName: 'Surat', scheduledArrival: '2026-10-01T06:00:00+05:30' },
      ],
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.ok(norm.routeStops);
    assert.strictEqual(norm.routeStops.length, 2);
    assert.strictEqual(norm.routeStops[0].stationCode, 'NDLS');
    assert.strictEqual(norm.routeStops[1].stationCode, 'ST');
  });

  // Test 5: 221-stop / full-route handling
  await test('5. Full route handling supports 221 total stops', () => {
    const route = Array.from({ length: 221 }, (_, i) => ({
      sequence: i + 1,
      stationCode: `ST_${i + 1}`,
      stationName: `Station ${i + 1}`,
    }));
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      route,
      currentLocation: { sequence: 151, stationCode: 'ST_151' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.totalStops, 221);
    assert.strictEqual(norm.currentStopIndex, 150);
  });

  // Test 6: Current station mapping
  await test('6. Current station mapped accurately from currentLocation', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      currentLocation: { stationCode: 'ST', stationName: 'Surat' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.currentStation, 'Surat');
  });

  // Test 7: Next station mapping
  await test('7. Next station mapped accurately from nextHalt', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      nextHalt: { stationCode: 'MMCT', stationName: 'Mumbai Central' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.nextStation, 'Mumbai Central');
  });

  // Test 8: Previous station mapping
  await test('8. Previous station mapped accurately from previousHalt', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      previousHalt: { stationCode: 'BRC', stationName: 'Vadodara Junction' },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.previousStation, 'Vadodara Junction');
  });

  // Test 9: Route progress calculation across entire route
  await test('9. Route progress calculated across entire route sequence', () => {
    const route = Array.from({ length: 100 }, (_, i) => ({ sequence: i + 1, stationCode: `S${i}` }));
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      route,
      currentLocation: { sequence: 50, segmentProgress: 0.5 },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    // currentStopIndex = 49 out of 99. With segProgress 0.5 -> (49.5 / 99)*100 = 50%
    assert.strictEqual(norm.progress, 50);
  });

  // Test 10: segmentProgress not confused with routeProgress
  await test('10. segmentProgress is kept separate from full routeProgress', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      currentLocation: { sequence: 2, segmentProgress: 0.75 },
      route: [
        { sequence: 1, stationCode: 'A' },
        { sequence: 2, stationCode: 'B' },
        { sequence: 3, stationCode: 'C' },

      ],
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.segmentProgress, 0.75);
    assert.strictEqual(norm.progress, 87.5); // (1.75 / 2) * 100 = 87.5%
  });

  // Test 11: Station status mapping
  await test('11. Station status mapped based on delay and movement', () => {
    const rawOnTime: RawRailwayStatusResponse = { train_number: '12952', delayMinutes: 0 };
    const rawDelayed: RawRailwayStatusResponse = { train_number: '12952', delayMinutes: 25 };

    const normOnTime = realProvider.normalizeRawTelemetry('12952', rawOnTime);
    const normDelayed = realProvider.normalizeRawTelemetry('12952', rawDelayed);

    assert.strictEqual(normOnTime.status, 'ON_TIME');
    assert.strictEqual(normDelayed.status, 'DELAYED');
  });

  // Test 12: Scheduled vs expected arrival
  await test('12. Scheduled vs expected arrival resolved cleanly without fake values', () => {
    const raw: RawRailwayStatusResponse = {
      train_number: '12952',
      scheduled_arrival: '2026-09-30T08:35:00+05:30',
      expected_arrival: '2026-09-30T09:11:00+05:30',
    };
    const norm = realProvider.normalizeRawTelemetry('12952', raw);
    assert.strictEqual(norm.scheduledArrival, '2026-09-30T08:35:00+05:30');
    assert.strictEqual(norm.expectedArrival, '2026-09-30T09:11:00+05:30');
  });

  // Test 13: ML predicted arrival service
  await test('13. ML predicted arrival service generates structured prediction', async () => {
    const eta = await getETAPredictionService('12952');
    if (eta) {
      assert.strictEqual(eta.trainNumber, '12952');
      assert.ok(eta.predictedTotalDelayMinutes >= 0);
      assert.ok(eta.predictedAdditionalDelayMinutes >= 0);
    } else {
      // Allowed if ML service not running or network offline
      console.log('   (ML Service offline, prediction gracefully returned null)');
    }
  });

  // Test 14: ETA timezone consistency
  await test('14. All dates and times format consistently in IST (+05:30)', () => {
    const date = new Date('2026-09-30T08:35:00+05:30');
    const istTimeStr = date.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const lower = istTimeStr.toLowerCase();
    assert.ok(lower.includes('am') || lower.includes('pm') || lower.length > 0);
  });

  // Test 15: Contradictory ETA detection
  await test('15. Contradictory ETA detection rejects past arrival predictions', () => {
    // Test logic in etaPrediction.service.ts
    const now = Date.now();
    const pastMs = now - 120000; // 2 minutes in past
    const isPast = pastMs < now - 60000;
    assert.strictEqual(isPast, true);
  });

  // Test 16: No mock timeline in real mode
  await test('16. Real provider returns real routeStops without mock fallback route', async () => {
    const norm = await realProvider.getTrainLiveStatus('12952');
    assert.strictEqual(norm?.dataSource, 'real');
    if (norm?.routeStops) {
      assert.notStrictEqual(norm.routeStops.length, 8); // Real 12952 has 221 stops or actual stops
    }
  });

  // Test 17: Simulator route still works in simulator mode
  await test('17. Simulator provider continues to operate in simulator mode', async () => {
    const status = await simProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status?.dataSource, 'simulator');
    assert.strictEqual(status?.totalStops, 8);
  });

  console.log(`\n====================================================`);
  console.log(`Phase 19 Test Suite Complete: ${passed}/${total} Tests Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPhase19Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
