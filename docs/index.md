# AirWatch Bologna — Documentazione

Indice della documentazione del progetto AirWatch Bologna.

---

## Note Tecniche

| File | Descrizione |
|---|---|
| [`notes/dettagli-tecnici-pipeline.md`](notes/dettagli-tecnici-pipeline.md) | Documentazione tecnica completa: fonte dati, schema, pipeline di elaborazione, statistiche, API reference, roadmap |
| [`notes/prompt-ibrido-bologna.md`](notes/prompt-ibrido-bologna.md) | Prompt ibrido CoT+ReAct ottimizzato per il caso di studio Bologna — 10 step operativi con template di esecuzione |
| [`notes/prompt-pipeline-ckan.md`](notes/prompt-pipeline-ckan.md) | Prompt generico per pipeline CKAN riutilizzabile su qualsiasi tema ambientale (aria, acqua, rifiuti, energia…) |

## Riferimenti

| File | Descrizione |
|---|---|
| [`links/references.md`](links/references.md) | Dataset, portali, normativa EU, strumenti e librerie usati nel progetto |

---

## Dataset

- **Portale**: [dati.gov.it](https://dati.gov.it/opendata) — CKAN 2.10.3
- **Dataset ID**: `dffca3ba-806e-4477-99ef-83904d01e640`
- **Titolo**: Centraline qualità dell'aria (misurazioni giornaliere)
- **Publisher**: Comune di Bologna / ARPAE Emilia-Romagna
- **Licenza**: CC BY 4.0
- **Periodo analizzato**: 31 dic 2025 → 5 apr 2026

## Struttura Dati

Ogni record nel dataset corrisponde a una **misurazione oraria** di un singolo inquinante su una stazione:

```
[timestamp UTC] × [stazione] × [inquinante] × [valore µg/m³]
```

Campi: `_id` · `reftime` · `stazione` · `value` · `agente_atm`

---

Torna al [README principale](../README.md).
