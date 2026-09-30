# GATIVERSE - System Architecture & Pluggable Data Provider Design

## Overview
GATIVERSE is designed as a decoupled, modular microservice system. To ensure high availability, scalability, and independence from external data provider formats, the backend architecture relies on a **Pluggable Railway Data Provider Interface**.

## Pluggable Railway Data Provider Pattern

```
┌───────────────────────────────┐
│ Dynamic Railway Data Provider │ (GTFS-RT / IRCTC / Simulator)
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│ Data Ingestion Adapter Layer  │
└───────────────┬───────────────┘
                │ Standardized Telemetry Interface
                ▼
┌───────────────────────────────┐
│ GATIVERSE Backend Engine      │
└───────────────┬───────────────┘
                ├── WebSocket / Socket.IO (Live Tracking)
                └── REST APIs (Services & ML Inference)
```

### Key Principles
1. **Interface Abstraction**: The core ETA calculation and tracking service interacts only with standard internal telemetry models (`TrainLocation`, `StationUpdate`, `DelayMetrics`).
2. **Provider Isolation**: Third-party APIs (e.g., GTFS Realtime feeds, national railway APIs, or mock telemetry simulators) implement an `IRailwayDataProvider` interface.
3. **Hot-Swappable Configuration**: Switching between real-world feeds and simulated data is governed by environment configuration without changing business logic.
