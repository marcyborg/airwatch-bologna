# Contributing to AirWatch Bologna

Thank you for your interest in contributing. This guide covers two main scenarios: **running the CKAN pipeline locally** to reproduce or extend the analysis, and **adding data for new monitoring stations** (*centraline*).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Running the Pipeline Locally](#running-the-pipeline-locally)
   - [Step 1 — Discover the portal via CKAN MCP Server](#step-1--discover-the-portal-via-ckan-mcp-server)
   - [Step 2 — Fetch the dataset](#step-2--fetch-the-dataset)
   - [Step 3 — Parse and clean](#step-3--parse-and-clean)
   - [Step 4 — Compute statistics](#step-4--compute-statistics)
   - [Step 5 — Update the dashboard](#step-5--update-the-dashboard)
3. [Adding a New Monitoring Station](#adding-a-new-monitoring-station)
4. [Extending to Other Cities or Portals](#extending-to-other-cities-or-portals)
5. [Pull Request Guidelines](#pull-request-guidelines)
6. [Reporting Issues](#reporting-issues)

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Python | 3.11+ | `pandas`, `requests` |
| Node.js | 18+ | For `link-generator.js` and optional `pptxgenjs` |
| CKAN MCP Server | latest | See [marcyborg/ckan-mcp-server](https://github.com/marcyborg/ckan-mcp-server) |
| An MCP-compatible AI client | — | e.g. Claude Desktop, Cursor, or any MCP host |

Install the Python dependencies (no `requirements.txt` is needed beyond the standard library and pandas):

```bash
pip install pandas requests
```

Install Node dependencies:

```bash
npm install
```

---

## Running the Pipeline Locally

The pipeline consists of 10 steps documented in full in [`docs/notes/pipeline-technical-details.md`](docs/notes/pipeline-technical-details.md). Below is the practical sequence to run it end-to-end.

### Step 1 — Discover the portal via CKAN MCP Server

Use the CKAN MCP Server with your AI agent to locate the dataset. The prompt templates in `docs/notes/` will guide the agent through portal discovery, status check, catalog stats, and dataset search.

**Quick reference — key identifiers already resolved:**

| Item | Value |
|---|---|
| Portal URL | `https://www.dati.gov.it/opendata` |
| Dataset ID | `dffca3ba-806e-4477-99ef-83904d01e640` |
| Historical dataset ID | `7657be0f-bb45-468e-8ea8-cc84e0cee0e4` |

To verify the dataset is still live:

```python
import requests

CKAN_API = "https://www.dati.gov.it/opendata/api/3/action/package_show"
resp = requests.get(CKAN_API, params={"id": "dffca3ba-806e-4477-99ef-83904d01e640"})
meta = resp.json()["result"]
print(meta["title"])           # Centraline qualità dell'aria (misurazioni giornaliere)
print(meta["frequency"])       # DAILY
print(meta["license_title"])   # Creative Commons Attribuzione 4.0 Internazionale
```

### Step 2 — Fetch the dataset

The CSV endpoint does not require authentication and returns the full current-year dataset in a single call:

```python
import pandas as pd

CSV_URL = (
    "https://opendata.comune.bologna.it/api/v2/catalog"
    "/datasets/centraline-qualita-aria/exports/csv?use_labels=true"
)

df = pd.read_csv(CSV_URL, sep=";")
print(df.shape)         # (N rows, 5 columns)
print(df.columns.tolist())
# ['_id', 'reftime', 'stazione', 'value', 'agente_atm']
```

For historical data (2017 onwards), replace the dataset slug in the URL:

```
https://opendata.comune.bologna.it/api/v2/catalog/datasets/centraline-qualita-aria-storico-dal-2017/exports/csv?use_labels=true
```

### Step 3 — Parse and clean

```python
# Parse UTC timestamps
df["reftime"] = pd.to_datetime(df["reftime"], utc=True)

# Extract date and short station name
df["date"]           = df["reftime"].dt.date
df["station_short"]  = df["stazione"].str.split(",").str[0].str.strip()

# Aggregate to daily averages per station / pollutant
daily = (
    df.groupby(["date", "station_short", "agente_atm"])["value"]
    .mean()
    .reset_index()
    .rename(columns={"agente_atm": "pollutant", "value": "avg_value"})
)
daily["date"] = pd.to_datetime(daily["date"])
```

**Expected stations in `station_short`:**

```
GIARDINI MARGHERITA   # Urban background
PORTA SAN FELICE      # Urban traffic
VIA CHIARINI          # Suburban background
```

### Step 4 — Compute statistics

```python
import json

stats = {}
for station in daily["station_short"].unique():
    stats[station] = {}
    subset = daily[daily["station_short"] == station]
    for pollutant in subset["pollutant"].unique():
        values = subset[subset["pollutant"] == pollutant]["avg_value"]
        stats[station][pollutant] = {
            "count": int(values.count()),
            "mean":  round(float(values.mean()), 2),
            "max":   round(float(values.max()),  2),
            "min":   round(float(values.min()),  2),
        }

# Detect PM10 exceedances (EU daily limit: 50 µg/m³)
pm10 = daily[daily["pollutant"] == "PM10"]
exceedances = (
    pm10[pm10["avg_value"] > 50]
    .groupby("station_short")
    .size()
    .to_dict()
)

print(json.dumps(exceedances, indent=2))
```

Save the output to `data/stats.json` so the dashboard and documentation stay in sync.

### Step 5 — Update the dashboard

`airwatch-bologna.html` embeds data as inline JSON. Search for the `const DATA = ` block near the top of the `<script>` section and replace the values with your newly computed stats. No build step is needed — the file is self-contained.

To verify the result, open `airwatch-bologna.html` in any modern browser.

---

## Adding a New Monitoring Station

ARPAE periodically adds new monitoring stations to the Bologna network. When a new station appears in the CSV, follow these steps to integrate it.

### 1. Confirm the station name

After fetching the CSV, check for previously unknown values in `station_short`:

```python
known = {"GIARDINI MARGHERITA", "PORTA SAN FELICE", "VIA CHIARINI"}
new_stations = set(daily["station_short"].unique()) - known
print(new_stations)
```

### 2. Identify its zone type

Each station has a measurement zone classification used in the dashboard:

| Zone type | Description | Example |
|---|---|---|
| `Urban traffic` | Near a busy road | Porta San Felice |
| `Urban background` | Residential / green area away from traffic | Giardini Margherita |
| `Suburban background` | Peripheral or peri-urban area | Via Chiarini |

Check [Open Data Bologna](https://opendata.comune.bologna.it/explore/dataset/centraline-qualita-aria) or [ARPAE's station registry](https://dati.arpae.it/dataset/qualita-dell-aria-rete-di-monitoraggio) to determine the correct classification.

### 3. Update `data/stats.json`

Add a new top-level key for the station following the existing schema:

```json
"NEW STATION NAME": {
  "NO2 (Biossido di azoto)": {
    "count": 1023,
    "mean": 18.4,
    "max": 55.0,
    "min": 2.0
  },
  "PM10": { ... },
  ...
}
```

### 4. Update the HTML dashboard

In `airwatch-bologna.html`, add the new station to:

- The **bar chart** datasets array (station comparison)
- The **KPI cards** if the station introduces a new extreme value
- The **statistics table** rows
- The **station info section** (zone type, pollutants monitored)

Use the existing station blocks as a template and maintain the color sequence from the Nexus design palette (`#20808D`, `#A84B2F`, `#1B474D`, …).

### 5. Update the documentation

- `data/stats.json` — already done in step 3
- `docs/notes/pipeline-technical-details.md` — update the stations table in section 2.4 and the completeness note in section 4.3
- `README.md` — update the station count and the key results table

### 6. Commit with a descriptive message

```bash
git add -A
git commit -m "feat: add <STATION NAME> monitoring station

- data/stats.json: added stats for <STATION NAME> (<zone type>)
- airwatch-bologna.html: station added to bar chart and stats table
- docs: updated station table and completeness notes
- Pollutants covered: <list>
- Period: <from> → <to>"
```

---

## Extending to Other Cities or Portals

The generic prompt in [`docs/notes/ckan-pipeline-prompt.md`](docs/notes/ckan-pipeline-prompt.md) is designed to be reused on any CKAN-compatible open data portal and any environmental theme. To adapt it:

1. Change the **portal URL** in Step 1 (`ckan_find_portals` parameters)
2. Update the **search query** in Step 4 to match the new theme/city
3. Adjust the **EU/WHO threshold values** in Step 8 for the relevant pollutants
4. Replace the dataset ID and CSV endpoint in the Python snippets above

The [CKAN MCP Server](https://github.com/marcyborg/ckan-mcp-server) supports any public CKAN portal (Italian, European, or international).

---

## Pull Request Guidelines

1. **Fork** the repository and create a feature branch: `git checkout -b feat/new-station-xyz`
2. Keep pull requests focused — one change per PR (new station, bug fix, or documentation update)
3. Update `data/stats.json` and the dashboard in the same commit if they are related
4. Ensure `airwatch-bologna.html` opens without errors in Chrome/Firefox before submitting
5. Reference any upstream data source changes (e.g. ARPAE station additions) in the PR description

---

## Reporting Issues

Open a [GitHub Issue](https://github.com/marcyborg/airwatch-bologna/issues) for:

- **Data gaps** — missing station or pollutant in the CSV
- **Threshold changes** — EU Directive or WHO guideline updates
- **Dashboard bugs** — rendering issues, incorrect values, broken dark mode
- **Pipeline errors** — CKAN API changes, endpoint deprecations

Please include the date of the issue and the affected station/pollutant when relevant.

---

*Data: Municipality of Bologna — processed by ARPAE Emilia-Romagna. License [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Pipeline code: MIT License.*
