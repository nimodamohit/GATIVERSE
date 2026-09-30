async function verifyEndpoints() {
  const baseUrl = 'http://localhost:5000';
  const endpoints = [
    '/api/health',
    '/api/data-provider/status',
    '/api/data-provider/verify',
    '/api/trains/stations/search?q=Bhopal',
    '/api/trains/search?from=BPL&to=NDLS&date=2026-09-30&live=true',
    '/api/live-trains/12952',
    '/api/trains/12952/availability?from=NDLS&to=MMCT&date=2026-09-30&class=3A&quota=GN',
    '/api/trains/12952/fare?from=NDLS&to=MMCT&date=2026-09-30&class=3A&quota=GN',
    '/api/train-eta/model-status',
    '/api/train-eta/12952',
  ];

  console.log('====================================================');
  console.log('GATIVERSE — Phase 17 API & Model Status Audit');
  console.log('====================================================\n');

  for (const ep of endpoints) {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}${ep}`);
      const duration = Date.now() - start;
      const data = await res.json();
      console.log(`[HTTP ${res.status}] ${ep} (${duration}ms)`);
      console.log(`  Payload snippet: ${JSON.stringify(data).slice(0, 160)}...\n`);
    } catch (err) {
      console.error(`❌ FAILED ${ep}: ${(err as Error).message}`);
    }
  }
}

verifyEndpoints();
