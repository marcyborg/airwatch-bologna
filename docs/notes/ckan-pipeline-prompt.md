# 🛰️ CKAN Open Data Pipeline Prompt
### Technique: ReAct (Reason + Act) + Chain-of-Thought + Structured Decomposition

---

## 📌 SYSTEM CONTEXT

You are an agent specialized in exploring CKAN open data portals and building end-to-end analytical data pipelines. You have access to the **CKAN MCP Server** tools and must use them **before responding**, even if you believe you already know the answer. Follow each step strictly in order. For each step: **Reason → Act → Observe → Conclude** before moving on to the next.

---

## 🎯 OBJECTIVE

> Build a **complete data pipeline** on an environmental theme (air quality, water, energy, waste — your choice) starting from a public CKAN portal, all the way to producing an **interactive HTML dashboard** with real data.

---

## 🔗 STEP 1 — Portal Discovery

**Objective**: Find the CKAN portal best suited to the chosen theme.

```
Tool to use: ckan_find_portals

Parameters to set:
  - country: [country of interest, e.g. "Italy"]
  - query: [thematic keyword, e.g. "environment" or "air quality"]
  - min_datasets: 50
  - has_datastore: false  ← initially false, then verify
  - language: [country language code, e.g. "it"]
  - limit: 10
```

**Expected reasoning (Chain-of-Thought)**:
- How many portals were found?
- Which portal has the highest number of relevant datasets?
- Does the portal have DataStore enabled? This affects the query strategy.
- Select the portal with the most suitable `server_url` and justify the choice.

**Output of this step**: `server_url` of the selected portal + rationale.

---

## 🔍 STEP 2 — Portal Verification and Language

**Objective**: Verify that the portal is reachable and detect the default language to formulate correct queries.

```
Tool to use: ckan_status_show

Parameters:
  - server_url: [value from STEP 1]
```

**Expected reasoning**:
- Does the portal respond? (status OK)
- What is the `locale_default`? (e.g. "it", "en", "fr")
- ⚠️ IMPORTANT: All queries in subsequent steps must be formulated in the portal's language.
- How many total datasets are present? This gives context on the catalog size.

**Output of this step**: Operational confirmation + language + catalog size.

---

## 📊 STEP 3 — Catalog Statistical Overview

**Objective**: Understand how the catalog is structured before searching for specific datasets.

```
Tool to use: ckan_catalog_stats

Parameters:
  - server_url: [value from STEP 1]
  - facet_limit: 20
```

**Expected reasoning**:
- Which organizations have the most datasets? Are they relevant to the theme?
- Which data formats are most common? (CSV, JSON, XLSX…)
- Are there categories/groups that match the chosen theme?
- What is the distribution: many small datasets or few large ones?

**Output of this step**: Top 3 organizations + Top 3 formats + most relevant thematic category.

---

## 🔎 STEP 4 — Relevant Dataset Search

**Objective**: Find the most relevant datasets for the theme, ranked by relevance.

```
Tool to use: ckan_find_relevant_datasets

Parameters:
  - server_url: [value from STEP 1]
  - query: [keyword in the portal's language, e.g. "air quality monitoring stations"]
  - limit: 10
  - weights: { "title": 5, "tags": 3, "notes": 2, "organization": 1 }
```

**Expected reasoning (Few-Shot)**:

*Example of a good result*: a dataset with score > 8.0, CSV format, updated within the last 12 months, with downloadable resources.

*Example of a result to discard*: dataset with score < 3.0, only PDF or unstructured format, last updated > 3 years ago.

**Winning dataset selection criteria**:
1. Relevance score > threshold (choose the threshold based on obtained results)
2. Must have at least 1 resource in CSV, JSON or Parquet format
3. Update frequency: prefer DAILY, WEEKLY or MONTHLY
4. Authoritative organization (public body, ARPAE, municipality, region)

**Output of this step**: Name + ID of the selected dataset + rationale.

---

## 📋 STEP 5 — Complete Dataset Inspection

**Objective**: Retrieve all metadata and available resources for the chosen dataset.

```
Tools to use (in sequence):

1. ckan_package_show
   Parameters:
   - server_url: [value from STEP 1]
   - id: [dataset ID from STEP 4]
   - response_format: "json"

2. ckan_list_resources
   Parameters:
   - server_url: [value from STEP 1]
   - id: [dataset ID from STEP 4]
```

**Expected reasoning**:
- Which resources are available? List: name, format, size, `datastore_active`.
- Is there at least one resource with `datastore_active: true`? → Use `ckan_datastore_search`.
- If not, what is the direct download URL for the best CSV/JSON resource?
- What quality metadata is present? (license, author, frequency, temporal coverage)

**Metadata checklist to verify**:
- [ ] `license_title` — does the license allow redistribution?
- [ ] `frequency` — how often is it updated?
- [ ] `issued` / `modified` — recent or outdated data?
- [ ] `publisher_name` — authoritative source?
- [ ] `language` — Italian or another language?

**Output of this step**: CSV resource URL + complete field list + data access plan.

---

## 🧩 STEP 6 — Data Schema Exploration

**Objective**: Understand the internal structure of the data before analyzing it.

```
Tool to use: ckan_analyze_datasets  ← if DataStore active

  Parameters:
  - server_url: [value from STEP 1]
  - q: [dataset name or ID]
  - rows: 1

OR

Tool to use: ckan_datastore_search  ← if DataStore active

  Parameters:
  - server_url: [value from STEP 1]
  - resource_id: [resource ID from STEP 5]
  - limit: 0   ← limit=0 returns ONLY the schema, no data
```

**Expected reasoning**:
- How many columns does the dataset have? What data types (text, numeric, timestamp)?
- What is the main temporal column? (for aggregations and trends)
- What is the geographic column? (station, municipality, province…)
- Which columns contain the measured values?
- Are there columns with ambiguous names to clarify?
- Build a conceptual map: `[time] × [location] × [measure]`

**Output of this step**: Annotated tabular schema with the role of each column.

---

## 📥 STEP 7 — Sampling and Validation

**Objective**: Download a representative sample and validate data quality.

```
Tool to use: ckan_datastore_search

Parameters:
  - server_url: [value from STEP 1]
  - resource_id: [resource ID from STEP 5]
  - limit: 100
  - sort: "[temporal_column] desc"   ← most recent data first
```

**Expected reasoning (Chain-of-Thought)**:

Analyze the sample and answer these questions:

1. **Completeness**: Are there null values in key columns? What percentage?
2. **Outliers**: Are there out-of-range values (negatives where unexpected, multiple zeros, extreme spikes)?
3. **Temporal granularity**: Is the data hourly, daily, monthly?
4. **Geographic granularity**: How many distinct stations/locations?
5. **Effective temporal coverage**: What date range is covered?
6. **Total volume estimate**: How many rows does the complete dataset have?

**Output of this step**: Data quality report (5-10 lines) + volume estimate.

---

## 📈 STEP 8 — Analytical Queries

**Objective**: Extract meaningful insights with targeted queries.

```
Tool to use: ckan_datastore_search (or ckan_datastore_search_sql if available)

Queries to run in sequence:

  8a. Distribution by main variable
      → group by [measure_column], compute mean, max, min

  8b. Temporal trend
      → filter by [main station], sort by [temporal_column] asc

  8c. Geographic comparison
      → group by [location_column], compute mean [measure_column]

  8d. Anomaly identification
      → filter where [measure_column] > [critical_threshold]
      (use EU, WHO, or industry-standard thresholds)
```

**SQL example for DataStore (if available)**:
```sql
-- 8a: averages by pollutant
SELECT agente_atm,
       ROUND(AVG(value::numeric), 2) AS mean,
       ROUND(MAX(value::numeric), 2) AS maximum,
       COUNT(*) AS n_measurements
FROM "resource_id_here"
GROUP BY agente_atm
ORDER BY mean DESC;

-- 8d: PM10 threshold exceedances
SELECT stazione, COUNT(*) AS exceedance_days
FROM "resource_id_here"
WHERE agente_atm = 'PM10' AND value::numeric > 50
GROUP BY stazione
ORDER BY exceedance_days DESC;
```

**Output of this step**: 4 analytical tables with insights for each query.

---

## 🎨 STEP 9 — Interactive Dashboard

**Objective**: Produce an HTML/JS dashboard with the real extracted data.

**Data to embed** (from STEPS 7 and 8):
- Key KPIs (mean, maximum, number of threshold exceedances)
- Temporal trend (line chart)
- Geographic comparison (bar chart)
- Descriptive statistics table

**Technical requirements**:
```
- Format: single static HTML file (no server required)
- Charts: Chart.js 4.4.0 via CDN
- Style: Nexus Design System (CSS variables --color-*, --text-*, --space-*)
- Theme: light/dark toggle
- Data: JSON embedded in HTML (no runtime fetch)
- Font: DM Sans via Google Fonts
- Mobile-first: works at 375px
```

**Dashboard structure**:
```
┌──────────────────────────────────────────────┐
│  HEADER: logo + title + light/dark toggle    │
├──────────────────────────────────────────────┤
│  KPI CARDS (4-8 key metrics)                 │
├───────────────────────┬──────────────────────┤
│  TEMPORAL TREND       │  GEO COMPARISON      │
│  (line chart)         │  (bar chart)         │
├───────────────────────┴──────────────────────┤
│  DETAILED STATISTICAL TABLE                  │
├──────────────────────────────────────────────┤
│  FOOTER: data source + license + CKAN link   │
└──────────────────────────────────────────────┘
```

**Output of this step**: File `theme-city-name.html` ready for the browser.

---

## ✅ STEP 10 — Quality Verification and Documentation

**Objective**: Validate the final result and document the pipeline.

**Final checklist**:

**Data**
- [ ] Do the KPI values match the real downloaded data?
- [ ] Do the charts show the correct temporal range?
- [ ] Are the alert thresholds (EU/WHO) cited with their source?
- [ ] Is dataset completeness indicated in the dashboard?

**Technical**
- [ ] Does the HTML file open without errors in a modern browser?
- [ ] Does the dark/light theme work correctly?
- [ ] Are the charts readable on mobile (375px)?
- [ ] Does the footer include: data source + license + original CKAN URL?

**Documentation**
- [ ] Create a `.md` document with: API source, data schema, calculated metrics, dataset limitations
- [ ] Indicate the extraction date and temporal coverage of the data
- [ ] Explicitly flag completeness gaps (e.g. "data missing for station X")

---

## 🔁 PROMPT VARIANTS

You can reuse this pipeline by changing the theme at the beginning:

| Theme | STEP 4 Keyword | Alert Threshold | Unit |
|---|---|---|---|
| Air quality | `air quality monitoring stations` | PM10 > 50 µg/m³/day | µg/m³ |
| Water quality | `water quality rivers lakes` | Nitrates > 50 mg/L | mg/L |
| Urban waste | `separate waste collection` | Separate collection < 65% (EU target) | % |
| Renewable energy | `energy production photovoltaic` | Carbon intensity > 100 gCO₂/kWh | gCO₂/kWh |
| Urban noise | `noise acoustic monitoring` | Leq > 65 dB(A) (daytime) | dB(A) |
| Mobility | `traffic vehicle flows` | LOS > congestion threshold | vehicles/h |

---

## 💡 PROMPTING NOTES

### Techniques used

| Technique | Where applied | Purpose |
|---|---|---|
| **ReAct** (Reason+Act) | Every step | Forces the model to reason before acting and observe the result |
| **Chain-of-Thought** | STEP 4, 7, 8 | Guiding questions for step-by-step analysis |
| **Few-Shot** | STEP 4 | Examples of good/bad results to calibrate selection |
| **Structured Decomposition** | Entire pipeline | Decomposition into atomic steps with explicit inputs/outputs |
| **Self-Check** | STEP 10 | Validation checklist to reduce hallucinations |
| **Role Prompting** | SYSTEM CONTEXT | Defines the agent role for behavioral consistency |
| **Constraint Injection** | STEP 9 requirements | Explicit technical constraints for deterministic output |

### Best practices for use

1. **Execute steps in order**: each step produces variables (server_url, resource_id…) needed by the next
2. **Save intermediate results**: copy key values (IDs, URLs) between steps
3. **Adapt the language**: if the portal is `locale: "fr"`, all queries must be in French
4. **If a tool fails**: read the error message, try an alternative term, then retry
5. **Completeness is negotiable**: if the dataset has gaps, document them rather than hiding them
