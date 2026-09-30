'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LiveRouteStopPayload {
  sequence: number;
  stationCode: string;
  stationName: string;
  lat?: number | null;
  lng?: number | null;
  scheduledArrival?: string | null;
  scheduledDeparture?: string | null;
  actualArrival?: string | null;
  actualDeparture?: string | null;
  delayArrival?: number | null;
  delayDeparture?: number | null;
  status?: string | null;
  distance?: number | null;
  platform?: string | null;
}

export interface LiveTrainStatusPayload {
  trainNumber: string;
  trainName: string;
  currentStation: string | null;
  nextStation: string | null;
  previousStation: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  delayMinutes: number;
  status: 'ON_TIME' | 'DELAYED' | 'ARRIVED' | 'DEPARTED' | 'CANCELLED';
  lastUpdated: string;
  expectedArrival: string | null;
  scheduledArrival?: string | null;
  progress: number | null;
  segmentProgress?: number | null;
  currentStopIndex?: number;
  totalStops?: number;
  dataSource?: 'simulator' | 'real';
  dataAgeSeconds?: number;
  isStale?: boolean;
  routeStops?: LiveRouteStopPayload[];
}

export interface ETAPredictionPayload {
  trainNumber: string;
  predictedAdditionalDelayMinutes: number;
  predictedTotalDelayMinutes: number;
  predictedArrival: string;
  modelVersion: string;
  predictionGeneratedAt: string;
  disclaimer?: string;
  modelSource?: 'synthetic-demo' | 'real-railway-telemetry';
  confidence?: number | null;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function useLiveTrainStatus(trainNumber: string) {
  const [liveStatus, setLiveStatus] = useState<LiveTrainStatusPayload | null>(null);
  const [etaPrediction, setEtaPrediction] = useState<ETAPredictionPayload | null>(null);
  const [predictionState, setPredictionState] = useState<'predicting' | 'updated' | 'unavailable'>('predicting');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!trainNumber) return;

    let isMounted = true;

    // Fetch initial status immediately via HTTP for fast initial render
    const fetchInitialData = async () => {
      try {
        const resStatus = await fetch(`${BACKEND_URL}/api/live-trains/${trainNumber}`);
        if (resStatus.ok) {
          const jsonStatus = await resStatus.json();
          if (isMounted && jsonStatus?.data) {
            setLiveStatus(jsonStatus.data);
          }
        }
      } catch {
        // Fallback to Socket.IO stream
      }

      try {
        const resEta = await fetch(`${BACKEND_URL}/api/train-eta/${trainNumber}`);
        if (resEta.ok) {
          const jsonEta = await resEta.json();
          if (isMounted && jsonEta?.data?.prediction) {
            setEtaPrediction(jsonEta.data.prediction);
            setPredictionState('updated');
          } else if (isMounted) {
            setPredictionState('unavailable');
          }
        } else if (isMounted) {
          setPredictionState('unavailable');
        }
      } catch {
        if (isMounted) setPredictionState('unavailable');
      }
    };

    fetchInitialData();

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (!isMounted) return;
      setIsConnected(true);
      setError(null);
      socket.emit('train:subscribe', { trainNumber });
    });

    socket.on('connect_error', (err) => {
      if (!isMounted) return;
      setIsConnected(false);
      setError('Live updates temporarily unavailable');
      setPredictionState('unavailable');
      console.warn('Socket connection warning:', err.message);
    });

    socket.on('disconnect', () => {
      if (!isMounted) return;
      setIsConnected(false);
      setPredictionState('unavailable');
    });

    socket.on('train:status:update', (data: LiveTrainStatusPayload) => {
      if (!isMounted) return;
      if (data && data.trainNumber === trainNumber) {
        setLiveStatus((prev) => {
          // Section 13: Protection against Socket.IO overwriting valid real data with empty/invalid payload
          if (prev && prev.dataSource === 'real' && data.dataSource === 'real') {
            const prevHasRealLocation = Boolean(prev.currentStation || prev.nextStation || (prev.routeStops && prev.routeStops.length > 0));
            const dataIsEmpty = !data.currentStation && !data.nextStation && (!data.routeStops || data.routeStops.length === 0);

            if (prevHasRealLocation && dataIsEmpty) {
              return {
                ...prev,
                isStale: true,
                dataAgeSeconds: data.dataAgeSeconds !== undefined ? data.dataAgeSeconds : (prev.dataAgeSeconds ? prev.dataAgeSeconds + 5 : 5),
                lastUpdated: data.lastUpdated || `Stale (${prev.dataAgeSeconds || 5}s ago)`,
              };
            }
          }
          return data;
        });
        setError(null);
      }
    });

    socket.on('train:eta:update', (data: ETAPredictionPayload) => {
      if (!isMounted) return;
      if (data && data.trainNumber === trainNumber) {
        setEtaPrediction(data);
        setPredictionState('updated');
      }
    });

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.emit('train:unsubscribe', { trainNumber });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [trainNumber]);

  return { liveStatus, etaPrediction, predictionState, isConnected, error };
}
