import assert from 'assert';
import { RealRailwayDataProvider } from '../providers/real/RealRailwayDataProvider.js';
import { RailwayApiClient, RawRailwayStatusResponse } from '../providers/real/RailwayApiClient.js';
import { SimulatorRailwayDataProvider } from '../providers/simulator/SimulatorRailwayDataProvider.js';

console.log('====================================================');
console.log('GATIVERSE — Phase 12 Telemetry Mapping Test Suite');
console.log('====================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`✅ TEST ${total} PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ TEST ${total} FAILED: ${name}`);
      console.error(`   Error: ${(err as Error).message}`);
    }
  }

  // Test A: Simulator mode returns valid simulated telemetry
  test('A. Simulator mode returns valid telemetry', async () => {
    const sim = new SimulatorRailwayDataProvider();
    const status = await sim.getTrainLiveStatus('12952');
    assert.ok(status, 'Status should not be null');
    assert.strictEqual(status?.dataSource, 'simulator');
    assert.strictEqual(status?.trainNumber, '12952');
  });

  // Test B: Missing credentials check
  test('B. API Client correctly identifies unconfigured state', () => {
    const client = new RailwayApiClient({ baseUrl: '', apiKey: '', timeoutMs: 5000 });
    assert.strictEqual(client.isConfigured(), false);
  });

  // Test C: Real provider handles live or fallback status safely
  test('C. Real provider returns valid telemetry (live or fallback)', async () => {
    const provider = new RealRailwayDataProvider();
    const status = await provider.getTrainLiveStatus('12952');
    assert.ok(status, 'Status should be returned');
    assert.ok(status?.dataSource === 'real' || status?.dataSource === 'simulator');
  });

  // Test D: Validation rejects invalid coordinates
  test('D. Validation rejects out-of-bounds coordinates', () => {
    const provider = new RealRailwayDataProvider();
    const invalidLatPayload: RawRailwayStatusResponse = {
      trainNo: '12952',
      lat: 150,
      lng: 77.4,
      delayMinutes: 10,
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidLatPayload), false);
  });

  // Test E: Validation rejects invalid speed
  test('E. Validation rejects invalid speed values', () => {
    const provider = new RealRailwayDataProvider();
    const invalidSpeedPayload: RawRailwayStatusResponse = {
      trainNo: '12952',
      speed: 450,
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidSpeedPayload), false);
  });

  // Test F: Validation rejects invalid delay
  test('F. Validation rejects invalid delay values', () => {
    const provider = new RealRailwayDataProvider();
    const invalidDelayPayload: RawRailwayStatusResponse = {
      trainNo: '12952',
      delayMinutes: -15,
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidDelayPayload), false);
  });

  // Test G: RailRadar payload normalization with currentLocation, halts, and route
  test('G. RailRadar structure normalization maps currentLocation, nextHalt, previousHalt, and route', () => {
    const provider = new RealRailwayDataProvider();
    const railRadarPayload: RawRailwayStatusResponse = {
      data: {
        train_number: '12952',
        train_name: 'Tejas Rajdhani Express',
        delayMinutes: 29,
        lastUpdatedAt: new Date().toISOString(),
        currentLocation: {
          stationCode: 'BPL',
          stationName: 'Bhopal Junction',
          speedKmh: 92,
          segmentProgress: 65,
          lat: 23.2599,
          lng: 77.4126,
        },
        previousHalt: {
          stationCode: 'GWL',
          stationName: 'Gwalior Junction',
        },
        nextHalt: {
          stationCode: 'ET',
          stationName: 'Itarsi Junction',
        },
        route: [
          { sequence: 1, stationCode: 'GWL', stationName: 'Gwalior Junction', status: 'PASSED' },
          { sequence: 2, stationCode: 'BPL', stationName: 'Bhopal Junction', status: 'RUNNING' },
          { sequence: 3, stationCode: 'ET', stationName: 'Itarsi Junction', status: 'UPCOMING' },
        ],
      },
    };

    assert.strictEqual(provider.validateRawTelemetry('12952', railRadarPayload), true);
    const normalized = (provider as unknown as { normalizeRawTelemetry: (num: string, raw: RawRailwayStatusResponse) => Record<string, unknown> }).normalizeRawTelemetry('12952', railRadarPayload);

    assert.strictEqual(normalized.trainNumber, '12952');
    assert.strictEqual(normalized.trainName, 'Tejas Rajdhani Express');
    assert.strictEqual(normalized.currentStation, 'Bhopal Junction');
    assert.strictEqual(normalized.nextStation, 'Itarsi Junction');
    assert.strictEqual(normalized.previousStation, 'Gwalior Junction');
    assert.strictEqual(normalized.speed, 92);
    assert.strictEqual(normalized.delayMinutes, 29);
    assert.strictEqual(normalized.segmentProgress, 65);
    assert.strictEqual(normalized.progress, 82.5);
    assert.strictEqual(normalized.latitude, 23.2599);
    assert.strictEqual(normalized.longitude, 77.4126);
    assert.ok(Array.isArray(normalized.routeStops));
    assert.strictEqual((normalized.routeStops as unknown[]).length, 3);
  });

  // Test H: Missing-field behavior returns null instead of fake placeholders
  test('H. Missing-field behavior returns null instead of fake placeholders', () => {
    const provider = new RealRailwayDataProvider();
    const minimalPayload: RawRailwayStatusResponse = {
      train_number: '12952',
      delayMinutes: 10,
    };

    const normalized = (provider as unknown as { normalizeRawTelemetry: (num: string, raw: RawRailwayStatusResponse) => Record<string, unknown> }).normalizeRawTelemetry('12952', minimalPayload);

    assert.strictEqual(normalized.currentStation, null);
    assert.strictEqual(normalized.nextStation, null);
    assert.strictEqual(normalized.previousStation, null);
    assert.strictEqual(normalized.speed, null);
    assert.notStrictEqual(normalized.currentStation, 'Enroute', 'Must NOT return fake "Enroute" placeholder');
    assert.notStrictEqual(normalized.nextStation, 'Upcoming Station', 'Must NOT return fake "Upcoming Station" placeholder');
  });

  console.log(`\n====================================================`);
  console.log(`Test Suite Complete: ${passed}/${total} Tests Passed`);
  console.log(`====================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
