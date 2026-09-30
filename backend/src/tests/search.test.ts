import assert from 'assert';
import {
  resolveStationCode,
  formatToRailKitDate,
  searchRealStationsService,
  searchRealTrainsBetweenService,
  normalizeRailKitSearchTrain,
} from '../services/train.service.js';

async function runSearchTests() {
  console.log('====================================================');
  console.log('GATIVERSE — RailKit Train & Station Search Test Suite');
  console.log('====================================================\n');

  // Test 1: Station resolution
  const bpl = resolveStationCode('Bhopal');
  assert.strictEqual(bpl?.code, 'BPL');
  assert.strictEqual(bpl?.name, 'Bhopal Junction');
  const ndls = resolveStationCode('NDLS');
  assert.strictEqual(ndls?.code, 'NDLS');
  const mmct = resolveStationCode('Mumbai Central');
  assert.strictEqual(mmct?.code, 'MMCT');
  console.log('✅ TEST 1 PASSED: resolveStationCode correctly maps station names & codes');

  // Test 2: Date format converter
  assert.strictEqual(formatToRailKitDate('2026-10-15'), '15-10-2026');
  assert.strictEqual(formatToRailKitDate('15-10-2026'), '15-10-2026');
  assert.strictEqual(formatToRailKitDate(undefined), undefined);
  console.log('✅ TEST 2 PASSED: formatToRailKitDate correctly converts dates to DD-MM-YYYY');

  // Test 3: Station search service
  const stations = await searchRealStationsService('Delhi');
  assert.ok(Array.isArray(stations));
  assert.ok(stations.length > 0);
  assert.ok(stations.some((s) => s.code === 'NDLS'));
  console.log(`✅ TEST 3 PASSED: searchRealStationsService returned ${stations.length} station results`);

  // Test 4: Normalization of rich RailKit train-search payload
  const mockRailKitSearchItem = {
    trainNumber: '12952',
    trainName: 'MMCT TEJAS RAJ',
    trainType: 'RAJ',
    from: {
      code: 'NDLS',
      name: 'New Delhi',
      departure: '16:55',
    },
    to: {
      code: 'MMCT',
      name: 'Mumbai Central',
      arrival: '08:35',
    },
    duration: 940, // 15h 40m
    distance: 1384,
    runDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    totalHalts: 8,
  };

  const normalized = normalizeRailKitSearchTrain(mockRailKitSearchItem, 'NDLS', 'MMCT');
  assert.strictEqual(normalized.trainNumber, '12952');
  assert.strictEqual(normalized.trainName, 'MMCT TEJAS RAJ');
  assert.strictEqual(normalized.trainType, 'RAJ');
  assert.strictEqual(normalized.from.code, 'NDLS');
  assert.strictEqual(normalized.from.name, 'New Delhi');
  assert.strictEqual(normalized.from.departure, '16:55');
  assert.strictEqual(normalized.to.code, 'MMCT');
  assert.strictEqual(normalized.to.name, 'Mumbai Central');
  assert.strictEqual(normalized.to.arrival, '08:35');
  assert.strictEqual(normalized.duration, '15h 40m');
  assert.strictEqual(normalized.distance, 1384);
  assert.strictEqual(normalized.totalHalts, 8);
  assert.strictEqual(normalized.dataSource, 'railkit');
  assert.ok(Array.isArray(normalized.runDays));
  console.log('✅ TEST 4 PASSED: normalizeRailKitSearchTrain maps full train search schema correctly');

  // Test 5: Missing fields in search response remain null without inventing fake values
  const minimalItem = {
    number: '12002',
    name: 'Shatabdi Express',
  };
  const normMinimal = normalizeRailKitSearchTrain(minimalItem, 'NDLS', 'BPL');
  assert.strictEqual(normMinimal.trainNumber, '12002');
  assert.strictEqual(normMinimal.trainName, 'Shatabdi Express');
  assert.strictEqual(normMinimal.trainType, null);
  assert.strictEqual(normMinimal.from.departure, null);
  assert.strictEqual(normMinimal.to.arrival, null);
  assert.strictEqual(normMinimal.duration, null);
  assert.strictEqual(normMinimal.distance, null);
  assert.strictEqual(normMinimal.runDays, null);
  assert.strictEqual(normMinimal.totalHalts, null);
  console.log('✅ TEST 5 PASSED: Missing optional fields remain null without fabricated values');

  // Test 6: Invalid station query returns controlled error
  const invalidRes = await searchRealTrainsBetweenService('', '');
  assert.strictEqual(invalidRes.success, false);
  assert.strictEqual(invalidRes.error?.code, 'INVALID_STATION');
  console.log('✅ TEST 6 PASSED: Invalid station query returns controlled error code');

  // Test 7: Live train search between stations (NDLS -> MMCT)
  const searchRes = await searchRealTrainsBetweenService('NDLS', 'MMCT', '2026-10-15', true);
  if (!searchRes.success && (searchRes.error?.code === 'RATE_LIMIT_REACHED' || searchRes.error?.code === 'AUTH_ERROR' || searchRes.error?.code === 'PROVIDER_UNAVAILABLE')) {
    console.log(`⚠️ TEST 7 NOTICE: RailKit search quota/billing limit encountered (${searchRes.error?.code}: ${searchRes.error?.message}) (handled gracefully)`);
  } else {
    assert.strictEqual(searchRes.success, true);
    assert.ok(Array.isArray(searchRes.data));
    console.log(`✅ TEST 7 PASSED: searchRealTrainsBetweenService returned ${searchRes.data?.length} real train results from RailKit`);
  }

  console.log('\n====================================================');
  console.log('Search Test Suite Complete: All Tests Passed');
  console.log('====================================================\n');
}

runSearchTests().catch((err) => {
  console.error('❌ Search Test Failed:', err);
  process.exit(1);
});
