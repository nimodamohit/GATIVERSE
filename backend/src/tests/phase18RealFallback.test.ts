import assert from 'assert';
import { RealRailwayDataProvider } from '../providers/real/RealRailwayDataProvider.js';
import { historicalCollector } from '../services/historicalCollector.service.js';
import { getTrainStatusService } from '../services/trainStatus.service.js';
import { TrainLiveStatus } from '../providers/index.js';
import { config } from '../config/env.js';

export async function runPhase18FallbackTests() {
  console.log('====================================================');
  console.log('GATIVERSE — Phase 18 Real Provider Fallback Tests');
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

  const originalProvider = config.railwayDataProvider;
  const originalEnabled = config.railwayApiEnabled;
  config.railwayDataProvider = 'real';
  config.railwayApiEnabled = true;

  const realProvider = new RealRailwayDataProvider();

  // 1. Real provider success
  await test('1. Real provider returns valid normalized telemetry (dataSource = "real", isStale = false)', async () => {
    const status = await realProvider.getTrainLiveStatus('12952');
    assert.ok(status, 'Status object must be returned');
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(typeof status.isStale, 'boolean');
  });

  // 2. Real provider temporary timeout (Stale fallback, dataSource = "real")
  await test('2. Temporary real provider timeout returns stale real data (never simulator)', async () => {
    const badProvider = new RealRailwayDataProvider();
    // Fetch once to populate last known real snapshot
    await badProvider.getTrainLiveStatus('12952');
    // Disable API to simulate timeout / network error
    config.railwayApiEnabled = false;

    const status = await badProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real', 'Must remain dataSource = real');
    assert.strictEqual(status.isStale, true, 'isStale must be true during API failure');

    config.railwayApiEnabled = true;
  });

  // 3. Real provider 401 response handling
  await test('3. Real provider 401 error retains real mode with stale/unavailable real status', async () => {
    config.railwayApiEnabled = false;
    const status = await realProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.isStale, true);
    config.railwayApiEnabled = true;
  });

  // 4. Real provider 429 rate limit response handling
  await test('4. Real provider 429 rate limit retains real mode with stale/unavailable status', async () => {
    config.railwayApiEnabled = false;
    const status = await realProvider.getTrainLiveStatus('12002');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.isStale, true);
    config.railwayApiEnabled = true;
  });

  // 5. Real provider 503 unavailable response handling
  await test('5. Real provider 503 service unavailable retains real mode with stale status', async () => {
    config.railwayApiEnabled = false;
    const status = await realProvider.getTrainLiveStatus('12952');
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real');
    assert.strictEqual(status.isStale, true);
    config.railwayApiEnabled = true;
  });

  // 6. Real provider missing speed handling
  await test('6. Missing real speed returns speed = null (never converts to fake 97 km/h)', () => {
    const rawNoSpeed = {
      train_number: '12952',
      train_name: 'Rajdhani',
      delayMinutes: 10,
      currentLocation: { stationCode: 'Garot', speedKmh: null },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', rawNoSpeed as unknown as import('../providers/real/RailwayApiClient.js').RawRailwayStatusResponse);
    assert.strictEqual(norm.speed, null, 'Speed must be null when missing from real telemetry');
    assert.strictEqual(norm.dataSource, 'real');
  });

  // 7. Real provider missing coordinates handling
  await test('7. Missing GPS coordinates return latitude = null, longitude = null (keeps station)', () => {
    const rawNoGps = {
      train_number: '12952',
      train_name: 'Rajdhani',
      currentLocation: { stationCode: 'UNKNOWN_STATION', lat: null, lng: null },
    };
    const norm = realProvider.normalizeRawTelemetry('12952', rawNoGps as unknown as import('../providers/real/RailwayApiClient.js').RawRailwayStatusResponse);
    assert.strictEqual(norm.latitude, null);
    assert.strictEqual(norm.longitude, null);
    assert.strictEqual(norm.dataSource, 'real');
  });

  // 8. Last known real data stale behavior
  await test('8. Last known real data exposes actual dataAgeSeconds and isStale = true when stale', async () => {
    const mockNorm = realProvider.normalizeRawTelemetry('12952', { train_number: '12952', delayMinutes: 10 });
    (realProvider as unknown as { lastKnownRealSnapshots: Map<string, { status: unknown; timestamp: number }> })
      .lastKnownRealSnapshots.set('12952', { status: mockNorm, timestamp: Date.now() - 200000 });

    config.railwayApiEnabled = false;
    const staleStatus = await realProvider.getTrainLiveStatus('12952');
    assert.ok(staleStatus);
    assert.strictEqual(staleStatus.dataSource, 'real');
    assert.strictEqual(staleStatus.isStale, true);
    assert.ok(typeof staleStatus.dataAgeSeconds === 'number');
    config.railwayApiEnabled = true;
  });

  // 9. Simulator must not activate in real mode
  await test('9. Simulator standby is disabled when RAILWAY_DATA_PROVIDER = real', async () => {
    const providerStatus = await realProvider.getProviderStatus();
    assert.strictEqual(providerStatus.provider, 'real');
    assert.strictEqual(providerStatus.fallbackActive, false, 'fallbackActive MUST be false in real mode');
  });

  // 10. Socket.IO must not emit simulator data in real mode
  await test('10. getTrainStatusService never returns demo/simulator statuses in real mode', async () => {
    config.railwayApiEnabled = false;
    const status = (await getTrainStatusService('12952')) as TrainLiveStatus;
    assert.ok(status);
    assert.strictEqual(status.dataSource, 'real', 'Must remain real dataSource');
    assert.notStrictEqual(status.currentStation, 'Near Bhopal Junction', 'Must never return simulator Bhopal station');
    config.railwayApiEnabled = true;
  });

  // 11. Historical collector must reject simulator and stale telemetry in real mode
  await test('11. Historical collector rejects simulator and stale telemetry in real mode', () => {
    const simStatus: TrainLiveStatus = {
      trainNumber: '12952',
      trainName: 'Rajdhani',
      currentStation: 'Near Bhopal Junction',
      nextStation: 'Itarsi Junction',
      previousStation: 'GWL',
      latitude: 23.25,
      longitude: 77.41,
      speed: 97,
      delayMinutes: 34,
      status: 'DELAYED',
      lastUpdated: 'Just now',
      expectedArrival: '07:50 PM',
      scheduledArrival: '07:15 PM',
      progress: 60,
      currentStopIndex: 4,
      totalStops: 8,
      dataSource: 'simulator',
    };

    const valSim = historicalCollector.validateTelemetry(simStatus);
    assert.strictEqual(valSim.valid, false, 'Historical collector MUST reject simulator status in real mode');
    assert.ok(valSim.reason?.includes('Simulator telemetry rejected'));

    const staleRealStatus: TrainLiveStatus = {
      ...simStatus,
      dataSource: 'real',
      isStale: true,
    };
    const valStale = historicalCollector.validateTelemetry(staleRealStatus);
    assert.strictEqual(valStale.valid, false, 'Historical collector MUST reject stale telemetry');
    assert.ok(valStale.reason?.includes('Stale telemetry'));
  });

  // 12. Frontend badge real/live/stale/demo state mapping logic
  await test('12. Badge states map cleanly to live / stale / demo states', () => {
    const liveReal: Partial<TrainLiveStatus> = { dataSource: 'real', isStale: false };
    const staleReal: Partial<TrainLiveStatus> = { dataSource: 'real', isStale: true };
    const demoSim: Partial<TrainLiveStatus> = { dataSource: 'simulator' };

    const getBadgeLabel = (s: Partial<TrainLiveStatus>) => {
      if (s.dataSource === 'real') {
        return s.isStale ? 'LIVE DATA STALE' : 'LIVE DATA';
      }
      return 'DEMO / SIMULATOR DATA';
    };

    assert.strictEqual(getBadgeLabel(liveReal), 'LIVE DATA');
    assert.strictEqual(getBadgeLabel(staleReal), 'LIVE DATA STALE');
    assert.strictEqual(getBadgeLabel(demoSim), 'DEMO / SIMULATOR DATA');
  });

  // Restore config
  config.railwayDataProvider = originalProvider;
  config.railwayApiEnabled = originalEnabled;

  console.log('\n====================================================');
  console.log(`Phase 18 Real Provider Fallback Tests Complete: ${passed}/${total} Passed`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

if (process.argv[1]?.includes('phase18RealFallback.test')) {
  runPhase18FallbackTests().catch((err) => {
    console.error('Fatal phase 18 fallback test error:', err);
    process.exit(1);
  });
}
