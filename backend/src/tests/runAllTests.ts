import { execSync } from 'child_process';

console.log('====================================================');
console.log('GATIVERSE — Complete Test Suite Execution');
console.log('====================================================\n');

try {
  console.log('--- 1. Running Telemetry Mapping Tests (provider.test.ts) ---');
  execSync('npx tsx src/tests/provider.test.ts', { stdio: 'inherit' });

  console.log('\n--- 2. Running Real Train Search Tests (search.test.ts) ---');
  execSync('npx tsx src/tests/search.test.ts', { stdio: 'inherit' });

  console.log('\n--- 3. Running Real Journey Planner Tests (journeyPlanner.test.ts) ---');
  execSync('npx tsx src/tests/journeyPlanner.test.ts', { stdio: 'inherit' });

  console.log('\n--- 4. Running Phase 17 Historical Collector & ML Tests (phase17Collector.test.ts) ---');
  execSync('npx tsx src/tests/phase17Collector.test.ts', { stdio: 'inherit' });

  console.log('\n--- 5. Running Phase 18 Real Provider Fallback Tests (phase18RealFallback.test.ts) ---');
  execSync('npx tsx src/tests/phase18RealFallback.test.ts', { stdio: 'inherit' });

  console.log('\n--- 6. Running Phase 19 Real Live Status & ETA Tests (phase19TimelineAndEta.test.ts) ---');
  execSync('npx tsx src/tests/phase19TimelineAndEta.test.ts', { stdio: 'inherit' });

  console.log('\n--- 7. Running Phase 19 Urgent Regression Fix Tests (phase19RegressionFix.test.ts) ---');
  execSync('npx tsx src/tests/phase19RegressionFix.test.ts', { stdio: 'inherit' });

  console.log('\n--- 8. Running RailKit V2 Provider Tests (railkit.test.ts) ---');
  execSync('npx tsx src/tests/railkit.test.ts', { stdio: 'inherit' });

  console.log('\n====================================================');
  console.log('🎉 ALL GATIVERSE BACKEND TEST SUITES PASSED SUCCESSFULLY');
  console.log('====================================================');
} catch (err) {
  console.error('\n❌ TEST RUNNER FAILED: One or more test suites failed.');
  process.exit(1);
}
