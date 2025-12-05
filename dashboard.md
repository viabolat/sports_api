# Sports Data Extractor Dashboard Guide

This guide explains how to use the Sports Data Extractor dashboard, including how each section works, how to fetch data, manage cache, and download results.

---

## 1. Overview

The dashboard allows you to extract NFL and NCAAF data from the BallDontLie API using two modes:

* **Quick Query** — instantly fetch data for a single request.
* **Historical Bulk** — fetch multiple seasons at once, with caching and rate‑limit handling.

It also provides tools for:

* Customizing parameters
* Filtering by dates
* Managing local cache
* Downloading results as JSON or CSV

---

## 2. Entering Your API Key

* Enter your API key in the **API Key** input field.
* The key is automatically saved locally so you don't have to re‑enter it.
* You can get your key from your BallDontLie dashboard.

---

## 3. Query Mode

### **Quick Query**

Use this for:

* Instant, single API requests
* Pulling data with optional date filters

### **Historical Bulk**

Use this for:

* Fetching multiple seasons in one operation
* Automatically applying rate‑limit delays
* Using caching to skip previously fetched seasons

If an endpoint does not support seasons, historical mode will be disabled.

---

## 4. League Selection

Choose between:

* **NFL**
* **NCAAF**

Changing leagues resets your endpoint and parameters.

---

## 5. Endpoint Selection

Endpoints determine the type of data you are requesting.
Each endpoint shows its tier:

* **Free** — available to all API plans
* **Pro** — requires an upgraded plan

Endpoints may support:

* Date filters
* Season filters
* Parameters such as team_ids, cursor, weeks, etc.

---

## 6. Local Cache

The system stores API responses in your browser's LocalStorage.

### Cache Options Include:

* **Enable/Disable Local Cache** — toggle caching on/off
* **View Cache Count** — number of stored responses
* **View Cache Size** — storage size in KB
* **Cache Hits** — how many times cached data was used instead of an API call
* **Clear All Cache** — remove all saved entries
* **Force Refresh** (in historical mode) — bypass cache and fetch fresh API results

Caching helps speed up repeated historical queries and reduces API usage.

---

## 7. Historical Mode — Season Selection

If using historical mode:

* Select one or more seasons
* Use **Select All** to mark every season
* Use **Clear** to remove selections
* A time estimate is shown (12 seconds per uncached season)

---

## 8. Date Filters (Quick Mode Only)

Use either:

* **Single Date**, or
* **Start + End Date Range**

These filters only apply to endpoints that support dates.

---

## 9. Query Parameters

Endpoints may allow optional parameters such as:

* `team_ids`
* `player_ids`
* `weeks`
* `cursor`
* `per_page`

For parameters ending in `_ids`, enter **comma‑separated values**.

---

## 10. Running Queries

Click **Fetch Data** (Quick Mode) or **Start Historical Fetch** (Historical Mode).

You’ll see:

* Loading indicator
* Progress bar for historical mode
* Error messages if something goes wrong

---

## 11. Viewing Results

The results section displays:

* Total item count
* Number of seasons (if historical)
* Whether data came from the cache or fresh API

---

## 12. Downloading Data

### **1. JSON (Combined)**

Creates a single JSON file containing all fetched results.

### **2. CSV (Flattened)**

Creates a CSV file where nested objects are flattened into column paths.
Useful for Excel, Sheets, or database import.

### **3. Per‑Season JSON Files (Historical Only)**

Downloads **one JSON file per season**, spaced out to avoid browser popup blocking.

---

## 13. Tips & Best Practices

* Enable caching for faster repeated bulk queries.
* Use force refresh if you want fresh results every time.
* Use CSV for spreadsheets and JSON for development.
* Bulk season downloads may take time due to API rate limits.

---

## 14. Troubleshooting

**Missing API Key** — Enter your BallDontLie API key.

**Endpoint doesn’t support seasons** — Switch to Quick Query or choose another endpoint.

**No results found** — Check parameters and date filters.

**Cache not updating** — Try clearing all cache.

---

This dashboard is designed to make sports data extraction simple, powerful, and customizable. Use quick mode for fast insights, historical mode for bulk datasets, and caching to optimize performance.

Enjoy exploring NFL and NCAAF data!
