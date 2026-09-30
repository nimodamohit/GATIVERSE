import 'dotenv/config';
import { RailwayApiClient } from '../providers/real/RailwayApiClient.js';
import { config } from '../config/env.js';

async function run() {
  const client = new RailwayApiClient({
    baseUrl: config.railwayApiBaseUrl,
    apiKey: config.railwayApiKey,
    timeoutMs: config.railwayApiTimeoutMs,
    cacheTtlMs: 0 // bypass cache for direct test
  });

  console.log('Testing raw API request for 12952...');
  const res = await client.fetchRawTrainStatus('12952');
  
  const baseUrlSanitized = config.railwayApiBaseUrl ? config.railwayApiBaseUrl.replace(/api_key=[^&]+/, 'api_key=***') : 'NOT_SET';
  
  console.log('=== SAFE DIAGNOSTIC REPORT ===');
  console.log('Base URL:', baseUrlSanitized);
  console.log('Request Path:', res.requestedPath);
  console.log('Query Parameters: none');
  console.log('HTTP Status:', res.statusCode);
  console.log('Response Time:', res.responseTimeMs, 'ms');
  console.log('Response Success Flag:', res.success);
  console.log('Error Code/Message:', res.errorMessage || 'None');
  
  if (res.data) {
    const dataObj = ((res.data as Record<string, unknown>).data || res.data) as Record<string, unknown>;
    console.log('trainNumber:', dataObj.train_number || dataObj.trainNo || dataObj.number || 'N/A');
    console.log('startDate:', dataObj.startDate || dataObj.start_date || dataObj.journeyDate || 'N/A');
    console.log('lastUpdatedAt:', dataObj.lastUpdatedAt || dataObj.last_updated_epoch || dataObj.last_updated_ts || 'N/A');
    console.log('trainName:', dataObj.train_name || dataObj.trainName || dataObj.name || 'N/A');
    const currLoc = dataObj.currentLocation as { stationName?: string } | undefined;
    console.log('currentStation:', currLoc?.stationName || dataObj.current_station || 'N/A');
    console.log('raw keys:', Object.keys(dataObj));
    console.log('raw JSON sample:', JSON.stringify(dataObj).slice(0, 500));
  } else {
    console.log('Raw Data: null');
  }
}

run().catch(console.error);
