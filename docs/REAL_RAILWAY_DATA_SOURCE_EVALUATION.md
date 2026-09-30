# GATIVERSE — Real Railway Data Source Evaluation (Phase 11)

## 1. Executive Summary & Evaluation Purpose

This document provides a comprehensive evaluation of legitimate, authorized live railway data sources for Indian Railways integration in GATIVERSE. 

> **Strict Non-Negotiable Policy:**
> - GATIVERSE **never** engages in unauthorized web scraping, CAPTCHA bypass, HTML parsing of public portals, or spoofing private mobile app tokens.
> - Integration is performed strictly via authorized REST APIs backed by valid API credentials.
> - In the absence of active authorized credentials, GATIVERSE operates transparently in **Simulator / Demo Mode**.

---

## 2. Comprehensive Candidate Provider Evaluation

### Candidate 1: Official Indian Railways / CRIS / NTES Developer Portal
- **Provider Name**: Centre for Railway Information Systems (CRIS) / National Train Enquiry System (NTES)
- **Official Website**: `https://www.cris.org.in` / `https://ntes.rail.gov.in`
- **API Documentation**: Official Government Developer Portal (Restricted Enterprise Partner Portal)
- **Data Source**: Direct GPS & Signaling Relay Telemetry from Indian Railways Train Control System
- **Live Train Status Availability**: Full (Real-time delay, current station, last departed station)
- **Current Location (Lat/Lng) Availability**: Station-level location; GPS lat/long available on select telemetry relays
- **Delay & Station Progress**: Full (Exact delay minutes per station)
- **Next Station & Route Availability**: Full (Complete station sequence and scheduled vs actual times)
- **ETA & Prediction Availability**: Raw expected arrival times provided
- **Cancellation / Diversion / Platform Information**: Full (Platform numbers, cancellations, diversions)
- **Authentication**: Enterprise OAuth2 Client Credentials + IP Whitelisting
- **API Key Requirement**: Mandatory (Enterprise Partner Credentials)
- **Pricing**: Government Partner Tier / Official MoU Required
- **Rate Limits & Polling Constraints**: 10,000 ms per train polling limit
- **Usage Terms & SIH Project Permission**: Restricted to official ministry partners, railway divisions, and hackathon MoU signees.
- **Raw Response JSON Format**:
```json
{
  "train_number": "12952",
  "train_name": "NDLS MMCT RAJDHANI",
  "current_station_code": "BPL",
  "current_station_name": "Bhopal Junction",
  "next_station_code": "ET",
  "next_station_name": "Itarsi Junction",
  "delay_in_minutes": 30,
  "status_code": "RUNNING",
  "scheduled_arrival_time": "19:15",
  "expected_arrival_time": "19:45",
  "latitude": 23.2599,
  "longitude": 77.4126,
  "last_updated_epoch": 1790582400
}
```

---

### Candidate 2: RapidAPI Indian Railways Authorized Partner API
- **Provider Name**: RapidAPI Indian Rail Partner API
- **Official Website**: `https://rapidapi.com/hub`
- **API Documentation**: `https://rapidapi.com/category/Transportation`
- **Data Source**: Authorized Data Aggregator Gateway
- **Live Train Status Availability**: Full (Live status by train number)
- **Current Location (Lat/Lng) Availability**: Station name & coordinates
- **Delay & Station Progress**: Full (Delay minutes and current stop index)
- **Next Station & Route Availability**: Full (Full timetable schedule)
- **ETA & Prediction Availability**: Static delay estimate
- **Cancellation / Diversion / Platform Information**: Partial (Platform numbers when available)
- **Authentication**: `x-rapidapi-key` & `x-rapidapi-host` headers
- **API Key Requirement**: Mandatory RapidAPI Key
- **Pricing**: Freemium (50 requests/day free; Paid tiers from $10 to $100/month)
- **Rate Limits & Polling Constraints**: 1 request every 5 seconds (Free tier)
- **Usage Terms & SIH Project Permission**: Permitted for non-commercial education, hackathons, and research projects.
- **Raw Response JSON Format**:
```json
{
  "trainNo": "12952",
  "trainName": "RAJDHANI EXPRESS",
  "currentStationName": "Bhopal Junction",
  "nextStationName": "Itarsi Junction",
  "delayMinutes": 25,
  "lat": 23.2599,
  "lng": 77.4126,
  "status_code": "DELAYED",
  "last_updated_epoch": 1790582400
}
```

---

### Candidate 3: Authorized Commercial Rail Data Partner API (RailYatri / RailRadar Partner Gateway)
- **Provider Name**: Commercial Rail Data Gateway
- **Official Website**: `https://www.railyatri.in`
- **API Documentation**: Commercial B2B Partner Portal
- **Data Source**: Crowd-sourced GPS + Authorized Railway Data Relay
- **Live Train Status Availability**: Full (Live train location & status)
- **Current Location (Lat/Lng) Availability**: High-precision GPS latitude & longitude
- **Delay & Station Progress**: Full (Station-by-station delay)
- **Next Station & Route Availability**: Full
- **ETA & Prediction Availability**: Provided
- **Cancellation / Diversion / Platform Information**: Full
- **Authentication**: API Token (`Bearer <token>`)
- **API Key Requirement**: Mandatory Commercial API Key
- **Pricing**: Enterprise Subscription ($50 - $300/month)
- **Rate Limits & Polling Constraints**: 100 requests/minute
- **Usage Terms & SIH Project Permission**: Commercial agreement required.
- **Raw Response JSON Format**:
```json
{
  "train_number": "12952",
  "train_name": "Rajdhani Express",
  "current_station": "Bhopal Junction",
  "next_station": "Itarsi Junction",
  "delay_minutes": 35,
  "speed": 95,
  "latitude": 23.2599,
  "longitude": 77.4126,
  "last_updated_epoch": 1790582400
}
```

---

## 3. Modular Separation of Data Provider Domains

GATIVERSE decouples railway backend functions into four independent provider domains:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Modular Provider Architecture                      │
├──────────────────┬──────────────────┬───────────────────┬───────────────────┤
│  Live Tracking   │  Train Schedule  │ Availability &    │ Booking & PNR     │
│  Provider        │  Provider        │ Fare Provider     │ Provider          │
├──────────────────┼──────────────────┼───────────────────┼───────────────────┤
│ - GPS Telemetry  │ - Station Routes │ - Class Quotas    │ - Passenger Res.  │
│ - Live Delays    │ - Timetables     │ - Fare Matrix     │ - Payment Gateway │
│ - Current Stop   │ - Distance (km)  │ - Seat Breakdown  │ - PNR Status      │
└──────────────────┴──────────────────┴───────────────────┴───────────────────┘
```

---

## 4. Current Mode Statement

GATIVERSE is currently running in **Simulator Mode** (`RAILWAY_DATA_PROVIDER=simulator`, `RAILWAY_API_ENABLED=false`).

> **Real railway live tracking will be activated automatically once authorized provider credentials are configured in `.env`.**
