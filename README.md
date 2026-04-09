# AirWatch Bologna

**Pipeline analitica end-to-end per la qualità dell'aria urbana di Bologna**

Progetto sviluppato nell'ambito dello **Short Master in Generative AI** — Università degli Studi di Bari Aldo Moro, a.a. 2025/2026.

AirWatch Bologna dimostra come un agente AI possa costruire una pipeline dati completa — dal discovery di un portale CKAN open data fino a una dashboard HTML interattiva — usando il **CKAN MCP Server** come interfaccia programmatica per l'accesso ai dati aperti istituzionali.

---

## Caso di Studio

| Campo | Valore |
|---|---|
| **Dataset** | [Centraline qualità dell'aria (misurazioni giornaliere)](https://www.dati.gov.it/view-dataset/dataset?id=dffca3ba-806e-4477-99ef-83904d01e640) |
| **Publisher** | Comune di Bologna |
| **Fonte dati** | ARPAE Emilia-Romagna |
| **Portale CKAN** | [dati.gov.it](https://dati.gov.it/opendata) |
| **Licenza** | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| **Periodo analizzato** | 31 dic 2025 → 5 apr 2026 (97 giorni) |
| **Record elaborati** | 10.000 misurazioni orarie |

**3 centraline monitorate**: Giardini Margherita · Porta San Felice · Via Chiarini  
**8 inquinanti**: NO₂ · O₃ · PM10 · PM2.5 · NOX · NO · CO · C₆H₆

---

## Struttura del Progetto

```
airwatch-bologna/
├── airwatch-bologna.html          # Dashboard HTML interattiva (aprire nel browser)
├── data/
│   └── stats.json                 # Statistiche calcolate (JSON)
├── docs/
│   ├── index.md                   # Indice della documentazione
│   ├── notes/
│   │   ├── dettagli-tecnici-pipeline.md   # Documentazione tecnica completa
│   │   ├── prompt-ibrido-bologna.md       # Prompt ibrido CoT+ReAct (caso Bologna)
│   │   └── prompt-pipeline-ckan.md        # Prompt generico pipeline CKAN
│   └── links/
│       └── references.md          # Riferimenti e risorse esterne
├── scripts/
│   └── link-generator.js          # Script per generare indice dei link
└── package.json
```

---

## Avvio Rapido

### Visualizzare la Dashboard

Apri `airwatch-bologna.html` direttamente nel browser — nessun server richiesto.

La dashboard include:
- KPI ambientali chiave (media NO₂, picchi PM10, giorni di superamento soglia)
- Trend mensile NO₂ e O₃ (gennaio–aprile 2026)
- Confronto tra le 3 centraline
- Tabella statistica completa per inquinante

### Generare l'indice dei link

```bash
npm install
npm run link
```

---

## Architettura della Pipeline

La pipeline segue 10 step operativi implementati tramite **CKAN MCP Server**:

```
[API dati.gov.it] → Discovery portale → Verifica stato → Esplorazione catalogo
→ Ricerca dataset → Ispezione metadati → Schema dati → Qualità dato
→ Analisi KPI → Dashboard HTML → Documento Finale
```

**Tecnica di prompting**: approccio ibrido **CoT** (Chain-of-Thought) + **ReAct** (Reason+Act) + **Structured Decomposition** con self-check finale.

Vedi [`docs/notes/prompt-ibrido-bologna.md`](docs/notes/prompt-ibrido-bologna.md) per il prompt completo e [`docs/notes/dettagli-tecnici-pipeline.md`](docs/notes/dettagli-tecnici-pipeline.md) per la documentazione tecnica.

---

## Risultati Principali

| Inquinante | Stazione | Media (µg/m³) | Massimo | Soglia EU |
|---|---|---|---|---|
| NO₂ | Porta San Felice | **31.4** | 127.0 | 40 µg/m³/anno |
| NO₂ | Giardini Margherita | 21.1 | 64.0 | 40 µg/m³/anno |
| NO₂ | Via Chiarini | 20.1 | 59.0 | 40 µg/m³/anno |
| PM10 | Porta San Felice | **33.9** | 58.0 | 50 µg/m³/giorno |
| PM10 | Giardini Margherita | 24.3 | 53.0 | 50 µg/m³/giorno |
| PM10 | Via Chiarini | 20.8 | 59.0 | 50 µg/m³/giorno |

**Trend stagionale**: NO₂ in calo da gennaio (29.2) ad aprile (17.0 µg/m³). O₃ in forte crescita da gennaio (17.3) ad aprile (56.0 µg/m³) con l'aumento dell'irradiazione solare.

---

## Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Discovery & Metadati | [CKAN MCP Server](https://github.com/marcyborg/ckan-mcp-server) |
| Acquisizione dati | Python `requests` / `pandas` |
| Analisi statistica | Python `pandas` 2.x |
| Dashboard | HTML5 + [Chart.js](https://www.chartjs.org/) 4.4.0 via CDN |
| Font | [DM Sans + DM Mono](https://fonts.google.com/) via Google Fonts |
| Presentazione | pptxgenjs |

---

## Licenza

Il **codice** è rilasciato sotto licenza MIT.

I **dati** sono rilasciati sotto [Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) — Comune di Bologna / ARPAE Emilia-Romagna.

> Dati: Comune di Bologna — elaborazione ARPAE Emilia-Romagna. Fonte: [dati.gov.it](https://dati.gov.it). Licenza CC BY 4.0.

---

## Autore

**Francesco Marchitelli** — [marchitelli.francesco@gmail.com](mailto:marchitelli.francesco@gmail.com)  
Short Master Generative AI — Università degli Studi di Bari Aldo Moro — a.a. 2025/2026
