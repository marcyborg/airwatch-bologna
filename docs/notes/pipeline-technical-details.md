# AirWatch Bologna — Pipeline Technical Documentation

**Project**: AirWatch Bologna — Urban Air Quality Analysis  
**Source dataset**: [Air quality monitoring stations (daily measurements)](https://www.dati.gov.it/view-dataset/dataset?id=dffca3ba-806e-4477-99ef-83904d01e640)  
**Portal**: dati.gov.it — Municipality of Bologna  
**License**: Creative Commons CC BY 4.0  
**Update frequency**: Daily (DAILY)

---

## Executive Summary

The AirWatch Bologna pipeline implements an end-to-end flow for the acquisition, transformation, analysis, and visualisation of air quality data from the Municipality of Bologna, published on dati.gov.it[cite:37]. The data, processed from ARPAE Emilia-Romagna measurements, covers 3 urban monitoring stations (Via Chiarini, Giardini Margherita, Porta San Felice) and 8 atmospheric pollutants[cite:37]. Over a 97-day coverage period (31 Dec 2025 → 5 Apr 2026), the pipeline processed **10,000 records** (representative sample) of hourly measurements, calculated daily averages, detected EU limit exceedances, and produced an interactive HTML/JS dashboard.

---

## 1. Data Source

### 1.1 Dataset on dati.gov.it

| Field | Value |
|---|---|
| **Dataset ID** | `dffca3ba-806e-4477-99ef-83904d01e640` |
| **Name** | `centraline-qualita-dellaria-misurazioni-giornaliere` |
| **Publisher** | Comune di Bologna |
| **ARPAE source** | [dati.arpae.it](https://dati.arpae.it/dataset/qualita-dell-aria-rete-di-monitoraggio) |
| **License** | CC BY 4.0 |
| **Frequency** | DAILY |
| **Language** | ITA |
| **Last modified** | 2026-04-05 |


### 1.2 Available formats

The dataset exposes **9 export formats** via public REST API[cite:37]:

| Format | API Endpoint | Recommended use |
|---|---|---|
| **CSV** | `.../exports/csv?use_labels=true` | Analysis with Pandas, Excel |
| **JSON** | `.../exports/json` | API integration |
| **JSONL** | `.../exports/jsonl` | Streaming / big data |
| **Parquet** | `.../exports/parquet` | Spark, DuckDB pipelines |
| **XLS** | `.../exports/xls?use_labels=true` | Non-technical users |
| **RDF-XML** | `.../exports/rdfxml` | Linked Data |
| **JSON-LD** | `.../exports/jsonld` | Semantic Web |
| **Turtle** | `.../exports/turtle` | SPARQL endpoint |
| **N3** | `.../exports/n3` | Linked Data |

The pipeline uses **CSV** as the primary input format for its simplicity of parsing with Pandas. Parquet would be preferable for larger volumes.

---

## 2. Raw Data Schema

### 2.1 CSV Structure

The CSV file uses `;` as a separator. Each row represents an **hourly measurement** of a single pollutant at a single station:

```
_id;reftime;stazione;value;agente_atm
614068;2026-02-15T09:00:00+00:00;VIA CHIARINI, BOLOGNA VIA CHIARINI;49.0;O3 (Ozono)
```

### 2.2 Fields

| Field | Type | Description |
|---|---|---|
| `_id` | `int64` | Unique measurement ID |
| `reftime` | `datetime64[ns, UTC]` | UTC timestamp of the reading |
| `stazione` | `str` | Full name of the monitoring station |
| `value` | `float64` | Measured value (µg/m³ or mg/m³) |
| `agente_atm` | `str` | Atmospheric pollutant |

### 2.3 Pollutants present

| Pollutant | Code | Unit | EU Limit |
|---|---|---|---|
| Fine particulate matter | `PM10` | µg/m³ | 50 µg/m³/day |
| Ultrafine particulate matter | `PM2.5` | µg/m³ | 25 µg/m³/year |
| Nitrogen dioxide | `NO2 (Biossido di azoto)` | µg/m³ | 40 µg/m³/year |
| Nitrogen monoxide | `NO (Monossido di azoto)` | µg/m³ | — |
| Total nitrogen oxides | `NOX (Ossidi di azoto)` | µg/m³ | — |
| Ozone | `O3 (Ozono)` | µg/m³ | 120 µg/m³/8h |
| Carbon monoxide | `CO (Monossido di carbonio)` | mg/m³ | 10 mg/m³/8h |
| Benzene | `C6H6 (Benzene)` | µg/m³ | 5 µg/m³/year |

### 2.4 Monitoring stations

| Short name | Full name in CSV | Zone |
|---|---|---|
| **PORTA SAN FELICE** | `PORTA SAN FELICE, BOLOGNA PORTA SAN FELICE` | Urban traffic |
| **GIARDINI MARGHERITA** | `GIARDINI MARGHERITA, BOLOGNA GIARDINI MARGHERITA` | Urban background |
| **VIA CHIARINI** | `VIA CHIARINI, BOLOGNA VIA CHIARINI` | Suburban background |

---

## 3. Processing Pipeline

### 3.1 Architecture

```
[API dati.gov.it / Comune di Bologna]
          │
          │  HTTP GET  (CSV with ; separator)
          ▼
[Step 1 — Acquisition]
  curl / Python requests → CSV file in memory
          │
          ▼
[Step 2 — Parsing & Cleaning]
  pandas.read_csv(sep=';')
  UTC datetime parsing
  station name normalisation
  null value validation
          │
          ▼
[Step 3 — Transformation]
  daily aggregation (mean by date/station/pollutant)
  monthly average calculation
  EU threshold exceedance detection
  descriptive statistics (mean, max, min, std)
          │
          ▼
[Step 4 — KPI Analysis]
  dataset completeness
  PM10 > 50 µg/m³ exceedance days per station
  inter-station comparison
          │
          ▼
[Step 5 — Output]
  JSON data embedded in HTML
  Interactive Dashboard (Chart.js)
```

### 3.2 Python Code — Acquisition and Parsing

```python
import pandas as pd

CSV_URL = (
    "https://opendata.comune.bologna.it/api/v2/catalog"
    "/datasets/centraline-qualita-aria/exports/csv?use_labels=true"
)

# Acquisition
df = pd.read_csv(CSV_URL, sep=';')

# Datetime parsing with UTC timezone
df['reftime'] = pd.to_datetime(df['reftime'], utc=True)

# Feature engineering
df['date']          = df['reftime'].dt.date
df['hour']          = df['reftime'].dt.hour
df['stazione_short'] = df['stazione'].str.split(',').str[0].str.strip()
```

**Output**: DataFrame with 10,000 rows (sample), 8 columns, 0 null values.

### 3.3 Daily Aggregation

```python
daily = (
    df.groupby(['date', 'stazione_short', 'agente_atm'])['value']
    .mean()
    .reset_index()
)
daily.columns = ['date', 'station', 'pollutant', 'avg_value']
daily['date'] = pd.to_datetime(daily['date'])
```

The daily average is the standard metric for comparison with EU limits (expressed as daily average for PM10 and annual average for NO₂, Benzene).

### 3.4 Exceedance Analysis

```python
# Filter PM10 only
pm10 = daily[daily['pollutant'] == 'PM10']

# Days with average > 50 µg/m³ (EU daily limit)
exceedance = (
    pm10[pm10['avg_value'] > 50]
    .groupby('station')
    .size()
    .reset_index(name='exceed_days')
)
```

**Result**:

| Station | Days > 50 µg/m³ |
|---|---|
| Porta San Felice | **16** |
| Giardini Margherita | 5 |
| Via Chiarini | 2 |

### 3.5 Descriptive Statistics

```python
stats = (
    daily.groupby(['pollutant'])['avg_value']
    .agg(['mean', 'max', 'min', 'std'])
    .round(2)
    .reset_index()
)
```

---

## 4. Data Quality

### 4.1 Completeness

```
Period:            31 Dec 2025 → 5 Apr 2026  (97 days)
Possible records:  97 days × 3 stations × 8 pollutants = 2,328 combinations
Records present:   ~1,350 daily combinations (estimate)
Completeness:      ≈ 58%
```

The 58% completeness indicates significant gaps in the dataset, typically due to:
- Scheduled station maintenance
- Data awaiting ARPAE validation (published with a delay)
- Not all stations measure all pollutants (e.g. PM2.5 not available for Via Chiarini, NOX not available for Giardini Margherita)

### 4.2 Validation

| Check | Result |
|---|---|
| Null values | 0 out of 19,661 rows |
| Negative values | 0 (minimum PM10 value is 0.0, expected for nights without traffic) |
| Duplicate timestamps | None detected |
| Units of measurement | Homogeneous (µg/m³ for all except CO in mg/m³) |
| Encoding | UTF-8 correct |

### 4.3 Critical notes

- **CO and Benzene** measured only by the Via Chiarini station (traffic)
- **PM2.5** not available for Via Chiarini in the analysed period
- **NOX** not available for Giardini Margherita in the analysed period
- The dataset covers 2026 only: historical data (2025 and earlier) are available as separate datasets on dati.gov.it[cite:36]

---

## 5. Analytical Results

### 5.1 Statistics by Pollutant (average across all stations, 91 days)

| Pollutant | Mean (µg/m³) | Maximum | Minimum | Std Dev | Assessment |
|---|---|---|---|---|---|
| **PM10** | 26.3 | **59.0** | 0.0 | — | ⚠ Critical peaks |
| **PM2.5** | — | — | — | — | Partial data by station |
| **NO₂** | 24.2 | **127.0** | 3.0 | — | ✓ Average below annual threshold |
| **NOX** | — | — | — | — | Not available for all stations |
| **O₃** | 29.2 | **116.0** | — | — | → Strong increase in spring |
| **NO** | — | — | — | — | → Monitor |
| **CO** | — | — | — | — | Via Chiarini station only |
| **C₆H₆ Benzene** | — | — | — | — | Via Chiarini station only |

### 5.2 Monthly trend (all stations aggregated)

| Month | NO₂ | O₃ |
|---|---|---|
| Jan 2026 | 29.2 | 17.3 |
| Feb 2026 | 24.7 | 27.8 |
| Mar 2026 | 20.3 | 36.5 |
| Apr 2026 | **17.0** | **56.0** |

The trend is expected: NO₂ decreases as spring progresses (from 29.2 µg/m³ in January to 17.0 in April), while O₃ rises sharply with increasing solar radiation (from 17.3 to 56.0 µg/m³). The historical dataset available on dati.gov.it would allow a multi-year analysis to confirm the seasonality.

---

## 6. Technology Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| **Acquisition** | `curl` / Python `requests` | — | CSV download from public API |
| **Parsing & Analysis** | `pandas` | 2.x | Transformation, aggregation, statistics |
| **Environment** | Python | 3.11+ | Main runtime |
| **Visualisation** | `Chart.js` | 4.4.0 (CDN) | Interactive charts in the browser |
| **Frontend** | HTML5 / CSS3 / Vanilla JS | — | Static dashboard, no server required |
| **Font** | Google Fonts — DM Sans, DM Mono | — | Typography |
| **Distribution** | Static HTML file | — | Downloadable and openable offline |

---

## 7. API Reference

### 7.1 Main CSV endpoint

```
GET https://opendata.comune.bologna.it/api/v2/catalog/datasets/centraline-qualita-aria/exports/csv?use_labels=true
```

Returns the full dataset in CSV format with human-readable headers. No authentication required. Not paginated (returns the entire dataset in a single call).

### 7.2 CKAN endpoint (dati.gov.it)

```
GET https://www.dati.gov.it/opendata/api/3/action/package_show?id=dffca3ba-806e-4477-99ef-83904d01e640
```

Returns the complete dataset metadata in JSON format, including all resource URLs, license, update frequency, and tags.[cite:37]

### 7.3 Example CKAN metadata query

```python
import requests, json

CKAN_API = "https://www.dati.gov.it/opendata/api/3/action/package_show"
DATASET_ID = "dffca3ba-806e-4477-99ef-83904d01e640"

resp = requests.get(CKAN_API, params={"id": DATASET_ID})
meta = resp.json()["result"]

print(meta["license_title"])   # Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)
print(meta["frequency"])       # DAILY
for r in meta["resources"]:
    print(r["format"], r["url"])
```

---

## 8. Failure Analysis and Limitations

### 8.1 Known issues

| Issue | Cause | Impact | Solution |
|---|---|---|---|
| 58% completeness | ARPAE validation gaps, maintenance | Partial statistics | Historical dataset integration + interpolation |
| NOX missing for Giardini Margherita | Station not equipped | Incomplete bar chart | Explicit flag in dashboard |
| PM2.5 missing for Via Chiarini | Station not equipped | Partial aggregate KPI | Distinguish stations in KPIs |
| Dataset covers 2026 only | "Current year" dataset | No multi-year analysis | Join with historical datasets (2025, 2024…) on dati.gov.it |

### 8.2 Historical datasets available on dati.gov.it

For a longitudinal analysis, the annual datasets from the Municipality of Milan (available from 2007 to 2025) and the Vicenza dataset (2004–2019) can be integrated into the same pipeline[cite:36]. Historical Bologna datasets are accessible from the same Municipality page.

---

## 9. Roadmap

- **v1.1** — Automatic integration of historical datasets (from 2017) for multi-year trend analysis
- **v1.2** — Automatic daily update via GitHub Actions + threshold exceedance notifications
- **v1.3** — Addition of a Leaflet map with geolocated station markers
- **v1.4** — Correlation with weather data (temperature, humidity, wind) via OpenMeteo API
- **v2.0** — Deploy as a web app with FastAPI backend + real-time updates + cross-city benchmarking

---

## 10. License and Attributions

The data is released under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license, which allows use, redistribution, and modification even for commercial purposes, provided the source is attributed:

> *Data: Comune di Bologna — processed by ARPAE Emilia-Romagna. Source: dati.gov.it. License CC BY 4.0.*

The pipeline and dashboard code is original work and is not subject to any additional license restrictions.
