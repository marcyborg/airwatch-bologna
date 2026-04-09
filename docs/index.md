# AirWatch Bologna — Documentation

Index of the AirWatch Bologna project documentation.

---

## Technical Notes

| File | Description |
|---|---|
| [`notes/pipeline-technical-details.md`](notes/pipeline-technical-details.md) | Full technical documentation: data source, schema, processing pipeline, statistics, API reference, roadmap |
| [`notes/hybrid-prompt-bologna.md`](notes/hybrid-prompt-bologna.md) | Hybrid CoT+ReAct prompt optimized for the Bologna case study — 10 operational steps with execution template |
| [`notes/ckan-pipeline-prompt.md`](notes/ckan-pipeline-prompt.md) | Generic reusable CKAN pipeline prompt for any environmental theme (air, water, waste, energy…) |

## References

| File | Description |
|---|---|
| [`links/references.md`](links/references.md) | Datasets, portals, EU regulations, tools and libraries used in the project |

---

## Dataset

- **Portal**: [dati.gov.it](https://dati.gov.it/opendata) — CKAN 2.10.3
- **Dataset ID**: `dffca3ba-806e-4477-99ef-83904d01e640`
- **Title**: Air quality monitoring stations (daily measurements)
- **Publisher**: Municipality of Bologna / ARPAE Emilia-Romagna
- **License**: CC BY 4.0
- **Period analyzed**: Dec 31 2025 → Apr 5 2026

## Data Structure

Each record in the dataset corresponds to a **hourly measurement** of a single pollutant at one station:

```
[UTC timestamp] × [station] × [pollutant] × [value µg/m³]
```

Fields: `_id` · `reftime` · `stazione` · `value` · `agente_atm`

---

Back to [main README](../README.md).
