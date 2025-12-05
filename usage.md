# 📘 Sports Data Extractor — User Guide

A complete guide for using the **NFL & NCAAF Sports Data Extractor Dashboard**.  
This dashboard lets you fetch **real-time** or **historical** data from the BallDontLie Football API with support for **bulk season pulls**, **local caching**, and **multiple download formats**.

---

## 📂 Table of Contents
1. Getting Started  
2. API Key Setup  
3. Choosing League & Endpoint  
4. Query Modes  
   - Quick Query  
   - Historical Bulk  
5. Parameters  
6. Date Filters  
7. Local Caching  
8. Fetching Data  
9. Download Options  
10. Results & Troubleshooting  

---

## 🚀 Getting Started
The Sports Data Extractor allows you to:

- Fetch NFL or NCAAF data
- Run single queries or bulk historical pulls
- Cache results locally to reduce API usage
- Download results as JSON or CSV
- Track progress for large jobs

---

## 🔑 API Key Setup

1. Visit **https://app.balldontlie.io**
2. Create an account
3. Copy your API key
4. Paste it into the **API Key** field in the dashboard

Notes:
- The key is stored in **localStorage**
- You only need to enter it once
- Requests will fail without a valid key

---

## 🏈 Choosing League & Endpoint

### League
- NFL
- NCAAF

Changing the league automatically updates available endpoints.

### Endpoints
Each endpoint indicates its required tier:
- **Free**
- **Pro**

Some endpoints support seasons, dates, or both.

---

## ⚙ Query Modes

### ✅ Quick Query
- Runs a single API request
- Best for small or real-time pulls
- Supports date filters (if the endpoint allows them)
- Uses cache when enabled

### 🕰 Historical Bulk Mode
- Fetches multiple seasons automatically
- One API request per season
- Enforces built-in rate limiting for uncached requests
- Shows progress bar and season counter
- Only available for endpoints that support seasons

You can:
- Select individual seasons
- Select all seasons
- Clear all selections
- Force refresh and bypass cache

---

## 📝 Parameters

Each endpoint exposes its supported parameters.

Examples:
- `team_ids`
- `player_ids`
- `weeks`
- `cursor`
- `per_page`

Rules:
- Use **comma-separated lists** for array style inputs
- Empty fields are ignored
- Parameters automatically update the request URL

---

## 📅 Date Filters
Available only in **Quick Query mode** and only for endpoints that support dates.

You may use:
- A single date  
- A date range (start + end)

Only one option can be active at a time.

---

## 💾 Local Caching

### Cache Toggle
- Enabled: responses are saved locally
- Disabled: every request hits the API

### Force Refresh
- Bypasses cache for the next request

### Cache Panel Shows
- Number of cached responses
- Approximate size
- Cache hit count

### Clear Cache
- Removes all cached responses
- API key remains untouched

---

## ▶ Fetching Data

Click **Fetch Data** to start.

While running:
- Quick mode shows a loading spinner
- Historical mode shows:
  - progress bar
  - season count
  - percentage completion
  - rate-limit notice

Errors appear in a clear alert box if something fails.

---

## 📥 Download Options

After data loads, you can download:

### 1️⃣ JSON (Combined)
- One file containing all results

### 2️⃣ CSV (Flattened)
- Nested objects flattened into columns
- Ideal for spreadsheets and analytics

### 3️⃣ Per-Season JSON (Historical Mode Only)
- Downloads one JSON file per season
- Files download sequentially to avoid popup blockers

---

## 📊 Results Display
The results panel shows:
- Total item count
- Season count (historical mode)
- Cache usage indicators
- Expandable JSON preview

---

## 🛠 Troubleshooting

- **401 / 403** → Invalid or missing API key  
- **Empty results** → Check filters and parameters  
- **Endpoint unsupported** → Switch endpoint or mode  
- **Stale data** → Enable Force Refresh or clear cache  

---

## ✅ Summary
The Sports Data Extractor provides a reliable, rate-limit-safe way to pull NFL and NCAAF data with flexible querying, caching, and export options.

You’re ready to go.
