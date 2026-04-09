# AirWatch Bologna

**End-to-end analytical pipeline for urban air quality monitoring in Bologna, Italy**

Project developed as part of the **Short Master in Generative AI** — University of Bari Aldo Moro, a.y. 2025/2026.

AirWatch Bologna demonstrates how an AI agent can build a complete data pipeline — from discovering a CKAN open data portal to producing an interactive HTML dashboard — using the **CKAN MCP Server** as a programmatic interface for accessing institutional open data.

---

## Case Study

| Field | Value |
|---|---|
| **Dataset** | [Air quality monitoring stations (daily measurements)](https://www.dati.gov.it/view-dataset/dataset?id=dffca3ba-806e-4477-99ef-83904d01e640) |
| **Publisher** | Municipality of Bologna |
| **Data source** | ARPAE Emilia-Romagna |
| **CKAN portal** | [dati.gov.it](https://dati.gov.it/opendata) |
| **License** | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| **Period analyzed** | Dec 31 2025 → Apr 5 2026 (97 days) |
| **Records processed** | 10,000 hourly measurements |

**3 monitoring stations**: Giardini Margherita · Porta San Felice · Via Chiarini  
**8 pollutants**: NO₂ · O₃ · PM10 · PM2.5 · NOX · NO · CO · C₆H₆

---

## Project Structure

```
airwatch-bologna/
├── airwatch-bologna.html          # Interactive HTML dashboard (open in browser)
├── data/
│   └── stats.json                 # Computed statistics (JSON)
├── docs/
│   ├── index.md                   # Documentation index
│   ├── notes/
│   │   ├── pipeline-technical-details.md  # Full technical documentation
│   │   ├── hybrid-prompt-bologna.md       # Hybrid CoT+ReAct prompt (Bologna case study)
│   │   └── ckan-pipeline-prompt.md        # Generic reusable CKAN pipeline prompt
│   └── links/
│       └── references.md          # References and external resources
├── scripts/
│   └── link-generator.js          # Script to generate documentation link index
└── package.json
```

---

## Quick Start

### View the Dashboard

Open `airwatch-bologna.html` directly in your browser — no server required.

The dashboard includes:
- Key environmental KPIs (average NO₂, PM10 peaks, days exceeding threshold)
- Monthly trend for NO₂ and O₃ (January–April 2026)
- Comparison across the 3 monitoring stations
- Full statistical table by pollutant

### Generate the link index

```bash
npm install
npm run link
```

---

## Pipeline Architecture

The pipeline follows 10 operational steps implemented via **CKAN MCP Server**:

```
[API dati.gov.it] → Portal discovery → Status check → Catalog exploration
→ Dataset search → Metadata inspection → Data schema → Data quality
→ KPI analysis → HTML dashboard → Final documentation
```

**Prompting technique**: hybrid **CoT** (Chain-of-Thought) + **ReAct** (Reason+Act) + **Structured Decomposition** with final self-check.

See [`docs/notes/hybrid-prompt-bologna.md`](docs/notes/hybrid-prompt-bologna.md) for the complete prompt and [`docs/notes/pipeline-technical-details.md`](docs/notes/pipeline-technical-details.md) for the technical documentation.

---

## Key Results

| Pollutant | Station | Avg (µg/m³) | Max | EU Limit |
|---|---|---|---|---|
| NO₂ | Porta San Felice | **31.4** | 127.0 | 40 µg/m³/year |
| NO₂ | Giardini Margherita | 21.1 | 64.0 | 40 µg/m³/year |
| NO₂ | Via Chiarini | 20.1 | 59.0 | 40 µg/m³/year |
| PM10 | Porta San Felice | **33.9** | 58.0 | 50 µg/m³/day |
| PM10 | Giardini Margherita | 24.3 | 53.0 | 50 µg/m³/day |
| PM10 | Via Chiarini | 20.8 | 59.0 | 50 µg/m³/day |

**Seasonal trend**: NO₂ declining from January (29.2) to April (17.0 µg/m³). O₃ rising sharply from January (17.3) to April (56.0 µg/m³) with increasing solar radiation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Discovery & Metadata | [CKAN MCP Server](https://github.com/marcyborg/ckan-mcp-server) |
| Data acquisition | Python `requests` / `pandas` |
| Statistical analysis | Python `pandas` 2.x |
| Dashboard | HTML5 + [Chart.js](https://www.chartjs.org/) 4.4.0 via CDN |
| Fonts | [DM Sans + DM Mono](https://fonts.google.com/) via Google Fonts |
| Presentation | pptxgenjs |

---

## License

**Code** is released under the MIT License.

**Data** is released under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) — Municipality of Bologna / ARPAE Emilia-Romagna.

> Data: Municipality of Bologna — processed by ARPAE Emilia-Romagna. Source: [dati.gov.it](https://dati.gov.it). License CC BY 4.0.

---

## Author

**Francesco Marchitelli** — [https://www.francescomarchitelli.com](https://www.francescomarchitelli.com)  
Short Master in Generative AI — University of Bari Aldo Moro — a.y. 2025/2026
