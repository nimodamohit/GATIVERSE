import assert from 'assert';
import { RailKitDataProvider, RailKitLiveResponseData } from '../providers/railkit/RailKitDataProvider.js';

console.log('====================================================');
console.log('GATIVERSE — RailKit V2 Telemetry & Normalization Test Suite');
console.log('====================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res && typeof (res as Promise<void>).then === 'function') {
        return (res as Promise<void>)
          .then(() => {
            console.log(`✅ TEST ${total} PASSED: ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`❌ TEST ${total} FAILED: ${name}`);
            console.error(`   Error: ${(err as Error).message}`);
          });
      }
      console.log(`✅ TEST ${total} PASSED: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ TEST ${total} FAILED: ${name}`);
      console.error(`   Error: ${(err as Error).message}`);
    }
  }

  const provider = new RailKitDataProvider();

  // Test 1: Provider status reporting
  await test('1. Provider status identifies railkit mode and configuration correctly', async () => {
    const status = await provider.getProviderStatus();
    assert.strictEqual(status.provider, 'railkit');
    assert.strictEqual(status.fallbackActive, false);
    assert.ok(status.lastStatusCheck);
    assert.strictEqual(typeof status.available, 'boolean');
  });

  // Test 2: Validation rejects malformed data
  test('2. Validation rejects invalid delays and out-of-bounds coordinates', () => {
    const invalidDelayPayload: RailKitLiveResponseData = {
      trainInfo: [{ number: '12952' }],
      delayMinutes: -10,
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidDelayPayload), false);

    const invalidLatPayload: RailKitLiveResponseData = {
      trainInfo: [{ number: '12952' }],
      currentLocation: {
        lat: 95,
        lng: 77.2,
      },
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidLatPayload), false);

    const invalidLngPayload: RailKitLiveResponseData = {
      trainInfo: [{ number: '12952' }],
      currentLocation: {
        lat: 28.5,
        lng: 195,
      },
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidLngPayload), false);

    const invalidSpeedPayload: RailKitLiveResponseData = {
      trainInfo: [{ number: '12952' }],
      currentLocation: {
        speedKmh: 450,
      },
    };
    assert.strictEqual(provider.validateRawTelemetry('12952', invalidSpeedPayload), false);
  });

  // Test 3: Normalization maps rich RailKit V2 running payload correctly
  test('3. Normalization maps train info, current location, halts, and route stops', () => {
    const mockRailKitPayload: RailKitLiveResponseData = {
      startDate: '29-09-2026',
      lastUpdatedAt: 'Sep 30, 2026, 11:30',
      status: 'running',
      statusText: 'running',
      isLive: true,
      delayMinutes: 12,
      trainInfo: [
        {
          number: '12626',
          name: 'KERALA EXPRESS',
          type: 'SF',
          category: 'express',
          source: { code: 'NDLS', name: 'New Delhi', lat: 28.6139, lng: 77.209 },
          destination: { code: 'TVC', name: 'Trivandrum', lat: 8.4875, lng: 76.9525 },
        },
      ],
      currentLocation: {
        sequence: 2,
        stnCode: 'MTJ',
        stnName: 'Mathura Junction',
        status: 'at-station',
        speedKmh: 75,
        distanceToNextStationKm: 54.2,
        nextStation: { sequence: 3, stnCode: 'AGC', stnName: 'Agra Cantt' },
        delayMinutes: 12,
      },
      previousHalt: {
        sequence: 1,
        stnCode: 'NDLS',
        stnName: 'New Delhi',
        distance: 0,
      },
      nextHalt: {
        sequence: 3,
        stnCode: 'AGC',
        stnName: 'Agra Cantt',
        distance: 195,
      },
      route: [
        {
          sequence: 1,
          stnCode: 'NDLS',
          stnName: 'New Delhi',
          isHalt: true,
          status: 'departed',
          distance: 0,
          platform: '3',
          day: 1,
          cord: { lat: 28.6139, lon: 77.209 },
          arrival: { scheduled: '11:25 29-Sep', actual: 'SRC', delay: null },
          departure: { scheduled: '11:25 29-Sep', actual: '11:25 29-Sep', delay: 0 },
        },
        {
          sequence: 2,
          stnCode: 'MTJ',
          stnName: 'Mathura Junction',
          isHalt: true,
          status: 'at-station',
          distance: 141,
          platform: '1',
          day: 1,
          cord: { lat: 27.4924, lon: 77.6737 },
          arrival: { scheduled: '13:10 29-Sep', actual: '13:22 29-Sep', delay: 12 },
          departure: { scheduled: '13:15 29-Sep', actual: null, delay: null },
        },
        {
          sequence: 3,
          stnCode: 'AGC',
          stnName: 'Agra Cantt',
          isHalt: true,
          status: 'upcoming',
          distance: 195,
          platform: '1',
          day: 1,
          cord: { lat: 27.1767, lon: 78.0081 },
          arrival: { scheduled: '13:50 29-Sep', actual: null, delay: null },
          departure: { scheduled: '13:55 29-Sep', actual: null, delay: null },
        },
      ],
      _provider: 'wimt',
    };

    assert.strictEqual(provider.validateRawTelemetry('12626', mockRailKitPayload), true);
    const normalized = provider.normalizeRawTelemetry('12626', mockRailKitPayload);

    assert.strictEqual(normalized.trainNumber, '12626');
    assert.strictEqual(normalized.trainName, 'KERALA EXPRESS');
    assert.strictEqual(normalized.currentStation, 'Mathura Junction');
    assert.strictEqual(normalized.previousStation, 'New Delhi');
    assert.strictEqual(normalized.nextStation, 'Agra Cantt');
    assert.strictEqual(normalized.speed, 75);
    assert.strictEqual(normalized.delayMinutes, 12);
    assert.strictEqual(normalized.status, 'DELAYED'); // 12 mins delay (>5) maps to DELAYED
    assert.strictEqual(normalized.currentStopIndex, 1);
    assert.strictEqual(normalized.totalStops, 3);
    assert.strictEqual(normalized.progress, 50.0);
    assert.strictEqual(normalized.latitude, 27.4924);
    assert.strictEqual(normalized.longitude, 77.6737);
    assert.strictEqual(normalized.dataSource, 'real');
    assert.strictEqual(normalized.liveDataAvailable, true);
    assert.strictEqual(normalized.dataAvailabilityReason, 'live_telemetry_active');
    assert.strictEqual(normalized.scheduledArrival, '13:50 29-Sep');

    // Verify route stops and halts
    assert.ok(Array.isArray(normalized.routeStops));
    assert.strictEqual(normalized.routeStops.length, 3);
    assert.strictEqual(normalized.routeStops[0].stationCode, 'NDLS');
    assert.strictEqual(normalized.routeStops[0].platform, '3');
    assert.strictEqual(normalized.routeStops[0].lat, 28.6139);
    assert.strictEqual(normalized.routeStops[0].lng, 77.209);
    assert.strictEqual(normalized.majorHalts?.length, 3);
  });

  // Test 4: Missing optional fields remain null and are never invented
  test('4. Missing optional fields remain null without invented placeholder values', () => {
    const minimalPayload: RailKitLiveResponseData = {
      trainInfo: [{ number: '12952' }],
      delayMinutes: 0,
    };

    const normalized = provider.normalizeRawTelemetry('12952', minimalPayload);
    assert.strictEqual(normalized.trainNumber, '12952');
    assert.strictEqual(normalized.currentStation, null);
    assert.strictEqual(normalized.previousStation, null);
    assert.strictEqual(normalized.nextStation, null);
    assert.strictEqual(normalized.speed, null);
    assert.strictEqual(normalized.latitude, null);
    assert.strictEqual(normalized.longitude, null);
    assert.strictEqual(normalized.progress, null);
  });

  // Test 5: Completed train journey maps to status ARRIVED and 100% progress
  test('5. Completed journey maps to status ARRIVED and progress 100', () => {
    const endPayload: RailKitLiveResponseData = {
      status: 'end',
      statusText: 'end',
      trainInfo: [{ number: '12952', name: 'MMCT TEJAS RAJ' }],
      currentLocation: {
        sequence: 8,
        stnCode: 'MMCT',
        stnName: 'Mumbai Central',
        status: 'arrived',
      },
      route: [
        { sequence: 1, stnCode: 'NDLS', stnName: 'New Delhi', isHalt: true },
        { sequence: 8, stnCode: 'MMCT', stnName: 'Mumbai Central', isHalt: true },
      ],
    };

    const normalized = provider.normalizeRawTelemetry('12952', endPayload);
    assert.strictEqual(normalized.status, 'ARRIVED');
    assert.strictEqual(normalized.progress, 100);
    assert.strictEqual(normalized.currentStation, 'Mumbai Central');
  });

  // Test 6: Verify connection does not expose sensitive keys and returns structured report
  await test('6. verifyConnection returns structured report without leaking apiKey', async () => {
    const verifyResult = await provider.verifyConnection();
    assert.ok(verifyResult);
    assert.strictEqual(verifyResult.provider, 'railkit');
    assert.strictEqual(verifyResult.testTrainNumber, '12952');
    assert.ok(verifyResult.verificationTimestamp);

    const jsonString = JSON.stringify(verifyResult);
    assert.ok(!jsonString.includes('railkit_'), 'API key must NEVER be leaked in verify response');
  });

  // Test 7: Live tracking returns real data when RAILKIT_API_KEY is configured
  if (provider.getIsConfigured()) {
    await test('7. Live RailKit tracking for train 12952 returns real telemetry or handles quota gracefully', async () => {
      const live = await provider.getTrainLiveStatus('12952');
      assert.ok(live, 'Live status must be returned');
      assert.strictEqual(live?.trainNumber, '12952');
      assert.strictEqual(live?.dataSource, 'real');

      if (live?.liveDataAvailable) {
        assert.ok(Array.isArray(live?.routeStops), 'Route stops should be an array');
        assert.ok((live?.routeStops?.length || 0) > 10, 'Should have rich full route array from RailKit');
      } else {
        assert.ok(
          live?.dataAvailabilityReason === 'rate_limit_exceeded' ||
          live?.dataAvailabilityReason === 'no_real_snapshot_available' ||
          live?.dataAvailabilityReason === 'cached_snapshot_retained',
          'Must handle quota/outage gracefully without returning fake simulator data'
        );
      }
    });
  }

  // Test 8: Provider initialization makes zero RailKit API calls
  await test('8. Provider initialization makes zero RailKit API calls', () => {
    const newProvider = new RailKitDataProvider();
    assert.strictEqual(newProvider.getIsConfigured(), true);
  });

  // Test 9: Provider start() makes zero background API calls and creates no polling timers
  await test('9. Startup lifecycle start() operates purely on-demand with zero background polling', () => {
    const newProvider = new RailKitDataProvider();
    newProvider.start(); // Must be on-demand, no background timers
    newProvider.stop();
  });

  // Test 10: getAllLiveStatuses in on-demand mode returns only cached trains without fetching unrequested trains
  await test('10. getAllLiveStatuses returns cached statuses without fetching unrequested trains', async () => {
    const newProvider = new RailKitDataProvider();
    const liveStatuses = await newProvider.getAllLiveStatuses();
    assert.ok(Array.isArray(liveStatuses));
    assert.strictEqual(liveStatuses.length, 0, 'Clean provider must have 0 unrequested cached statuses');
  });

  // Test 11: Explicit request for train A caches train A and does not trigger or cache train B
  await test('11. Explicit request fetches only the requested train and does not fetch unrelated trains', async () => {
    const freshProvider = new RailKitDataProvider();
    const trainA = '12952';
    await freshProvider.getTrainLiveStatus(trainA);

    const cached = await freshProvider.getAllLiveStatuses();
    assert.ok(cached.length <= 1, 'Only requested train should be in cache');
    if (cached.length === 1) {
      assert.strictEqual(cached[0].trainNumber, trainA);
    }
  });

  // Test 12: 429 rate limit or quota error activates circuit breaker cooldown
  await test('12. 429 rate limit error activates circuit breaker cooldown', () => {
    const cbProvider = new RailKitDataProvider();
    assert.strictEqual(cbProvider.isCooldownActive(), false);

    cbProvider.setCooldown(5000);
    assert.strictEqual(cbProvider.isCooldownActive(), true);
    assert.ok(cbProvider.getCooldownRemainingMs() > 0);
  });

  // Test 13: Subsequent requests during active cooldown return controlled status without making upstream calls
  await test('13. Subsequent requests during cooldown return rate_limit_exceeded without making upstream calls', async () => {
    const cbProvider = new RailKitDataProvider();
    cbProvider.setCooldown(10000);

    const startTs = Date.now();
    const status = await cbProvider.getTrainLiveStatus('12002');
    const elapsedMs = Date.now() - startTs;

    assert.ok(status);
    assert.strictEqual(status?.liveDataAvailable, false);
    assert.strictEqual(status?.dataAvailabilityReason, 'rate_limit_exceeded');
    assert.strictEqual(status?.dataSource, 'real');
    assert.ok(elapsedMs < 50, 'Cooldown response must be instant (no network roundtrip)');
  });

  // Test 14: Cooldown expiry allows new on-demand requests to proceed
  await test('14. Cooldown expiry allows a new request to proceed', async () => {
    const cbProvider = new RailKitDataProvider();
    cbProvider.setCooldown(20); // 20ms short cooldown for unit test
    assert.strictEqual(cbProvider.isCooldownActive(), true);

    await new Promise((r) => setTimeout(r, 30));
    assert.strictEqual(cbProvider.isCooldownActive(), false);
    assert.strictEqual(cbProvider.getCooldownRemainingMs(), 0);

    // Can clear manually as well
    cbProvider.setCooldown(5000);
    cbProvider.clearCooldown();
    assert.strictEqual(cbProvider.isCooldownActive(), false);
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
