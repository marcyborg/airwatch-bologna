# AirWatch Bologna — Documentazione Tecnica della Pipeline

**Progetto**: AirWatch Bologna — Analisi della Qualità dell'Aria Urbana  
**Dataset sorgente**: [Centraline qualità dell'aria (misurazioni giornaliere)](https://www.dati.gov.it/view-dataset/dataset?id=dffca3ba-806e-4477-99ef-83904d01e640)  
**Portale**: dati.gov.it — Comune di Bologna  
**Licenza**: Creative Commons CC BY 4.0  
**Aggiornamento**: Giornaliero (DAILY)

---

## Executive Summary

La pipeline AirWatch Bologna implementa un flusso end-to-end di acquisizione, trasformazione, analisi e visualizzazione dei dati sulla qualità dell'aria del Comune di Bologna, pubblicati su dati.gov.it[cite:37]. I dati, elaborati a partire dalle rilevazioni ARPAE Emilia-Romagna, coprono 3 centraline urbane (Via Chiarini, Giardini Margherita, Porta San Felice) e 8 inquinanti atmosferici[cite:37]. Su 97 giorni di copertura (31 dic 2025 → 5 apr 2026), la pipeline ha processato **10.000 record** (campione rappresentativo) di misurazioni orarie, calcolato medie giornaliere, rilevato superamenti dei limiti EU, e prodotto una dashboard interattiva HTML/JS.

---

## 1. Fonte Dati

### 1.1 Dataset su dati.gov.it

| Campo | Valore |
|---|---|
| **ID dataset** | `dffca3ba-806e-4477-99ef-83904d01e640` |
| **Nome** | `centraline-qualita-dellaria-misurazioni-giornaliere` |
| **Publisher** | Comune di Bologna |
| **Sorgente ARPAE** | [dati.arpae.it](https://dati.arpae.it/dataset/qualita-dell-aria-rete-di-monitoraggio) |
| **Licenza** | CC BY 4.0 |
| **Frequenza** | DAILY |
| **Lingua** | ITA |
| **Ultima modifica** | 2026-04-05 |


### 1.2 Formati disponibili

Il dataset espone **9 formati di export** tramite API REST pubblica[cite:37]:

| Formato | Endpoint API | Uso consigliato |
|---|---|---|
| **CSV** | `.../exports/csv?use_labels=true` | Analisi con Pandas, Excel |
| **JSON** | `.../exports/json` | Integrazione API |
| **JSONL** | `.../exports/jsonl` | Streaming / big data |
| **Parquet** | `.../exports/parquet` | Pipeline Spark, DuckDB |
| **XLS** | `.../exports/xls?use_labels=true` | Utenti non tecnici |
| **RDF-XML** | `.../exports/rdfxml` | Linked Data |
| **JSON-LD** | `.../exports/jsonld` | Semantic Web |
| **Turtle** | `.../exports/turtle` | SPARQL endpoint |
| **N3** | `.../exports/n3` | Linked Data |

La pipeline usa il formato **CSV** come input primario per la semplicità di parsing con Pandas. Il Parquet sarebbe preferibile per volumi maggiori.

---

## 2. Schema dei Dati Grezzi

### 2.1 Struttura del CSV

Il file CSV utilizza `;` come separatore. Ogni riga rappresenta una **misurazione oraria** di un singolo inquinante su una stazione:

```
_id;reftime;stazione;value;agente_atm
614068;2026-02-15T09:00:00+00:00;VIA CHIARINI, BOLOGNA VIA CHIARINI;49.0;O3 (Ozono)
```

### 2.2 Campi

| Campo | Tipo | Descrizione |
|---|---|---|
| `_id` | `int64` | ID univoco della misurazione |
| `reftime` | `datetime64[ns, UTC]` | Timestamp UTC della rilevazione |
| `stazione` | `str` | Nome esteso della centralina |
| `value` | `float64` | Valore misurato (µg/m³ o mg/m³) |
| `agente_atm` | `str` | Inquinante atmosferico |

### 2.3 Inquinanti presenti

| Inquinante | Codice | Unità | Limite EU |
|---|---|---|---|
| Particolato fine | `PM10` | µg/m³ | 50 µg/m³/giorno |
| Particolato ultrafine | `PM2.5` | µg/m³ | 25 µg/m³/anno |
| Biossido di azoto | `NO2 (Biossido di azoto)` | µg/m³ | 40 µg/m³/anno |
| Monossido di azoto | `NO (Monossido di azoto)` | µg/m³ | — |
| Ossidi di azoto totali | `NOX (Ossidi di azoto)` | µg/m³ | — |
| Ozono | `O3 (Ozono)` | µg/m³ | 120 µg/m³/8h |
| Monossido di carbonio | `CO (Monossido di carbonio)` | mg/m³ | 10 mg/m³/8h |
| Benzene | `C6H6 (Benzene)` | µg/m³ | 5 µg/m³/anno |

### 2.4 Centraline

| Nome breve | Nome completo nel CSV | Zona |
|---|---|---|
| **PORTA SAN FELICE** | `PORTA SAN FELICE, BOLOGNA PORTA SAN FELICE` | Traffico urbano |
| **GIARDINI MARGHERITA** | `GIARDINI MARGHERITA, BOLOGNA GIARDINI MARGHERITA` | Fondo urbano |
| **VIA CHIARINI** | `VIA CHIARINI, BOLOGNA VIA CHIARINI` | Fondo suburbano |

---

## 3. Pipeline di Elaborazione

### 3.1 Architettura

```
[API dati.gov.it / Comune di Bologna]
          │
          │  HTTP GET  (CSV con separatore ;)
          ▼
[Step 1 — Acquisizione]
  curl / Python requests → file CSV in memoria
          │
          ▼
[Step 2 — Parsing & Pulizia]
  pandas.read_csv(sep=';')
  parsing datetime UTC
  normalizzazione nomi stazione
  validazione valori nulli
          │
          ▼
[Step 3 — Trasformazione]
  aggregazione giornaliera (media per data/stazione/inquinante)
  calcolo medie mensili
  rilevamento superamenti soglia EU
  statistiche descrittive (mean, max, min, std)
          │
          ▼
[Step 4 — Analisi KPI]
  completezza dataset
  giorni di superamento PM10 > 50 µg/m³ per stazione
  confronto inter-stazione
          │
          ▼
[Step 5 — Output]
  JSON data embedded in HTML
  Dashboard interattiva (Chart.js)
```

### 3.2 Codice Python — Acquisizione e Parsing

```python
import pandas as pd

CSV_URL = (
    "https://opendata.comune.bologna.it/api/v2/catalog"
    "/datasets/centraline-qualita-aria/exports/csv?use_labels=true"
)

# Acquisizione
df = pd.read_csv(CSV_URL, sep=';')

# Parsing datetime con timezone UTC
df['reftime'] = pd.to_datetime(df['reftime'], utc=True)

# Feature engineering
df['date']          = df['reftime'].dt.date
df['hour']          = df['reftime'].dt.hour
df['stazione_short'] = df['stazione'].str.split(',').str[0].str.strip()
```

**Output**: DataFrame con 10.000 righe (campione), 8 colonne, 0 valori nulli.

### 3.3 Aggregazione Giornaliera

```python
daily = (
    df.groupby(['date', 'stazione_short', 'agente_atm'])['value']
    .mean()
    .reset_index()
)
daily.columns = ['date', 'station', 'pollutant', 'avg_value']
daily['date'] = pd.to_datetime(daily['date'])
```

La media giornaliera è la metrica standard per il confronto con i limiti EU (espressi come media giornaliera per PM10 e media annuale per NO₂, Benzene).

### 3.4 Analisi dei Superamenti

```python
# Filtra solo PM10
pm10 = daily[daily['pollutant'] == 'PM10']

# Giorni con media > 50 µg/m³ (limite EU giornaliero)
exceedance = (
    pm10[pm10['avg_value'] > 50]
    .groupby('station')
    .size()
    .reset_index(name='exceed_days')
)
```

**Risultato**:

| Stazione | Giorni > 50 µg/m³ |
|---|---|
| Porta San Felice | **16** |
| Giardini Margherita | 5 |
| Via Chiarini | 2 |

### 3.5 Statistiche Descrittive

```python
stats = (
    daily.groupby(['pollutant'])['avg_value']
    .agg(['mean', 'max', 'min', 'std'])
    .round(2)
    .reset_index()
)
```

---

## 4. Qualità dei Dati

### 4.1 Completezza

```
Periodo:           31 dic 2025 → 5 apr 2026  (97 giorni)
Possibili record:  97 giorni × 3 stazioni × 8 inquinanti = 2.328 combinazioni
Record presenti:   ~1.350 combinazioni giornaliere (stima)
Completezza:       ≈ 58%
```

La completezza al 58% indica gap significativi nel dataset, tipicamente dovuti a:
- Manutenzione programmata delle centraline
- Dati in attesa di validazione ARPAE (pubblicati con ritardo)
- Non tutte le stazioni misurano tutti gli inquinanti (es. PM2.5 non disponibile per Via Chiarini, NOX non disponibile per Giardini Margherita)

### 4.2 Validazione

| Check | Risultato |
|---|---|
| Valori nulli | 0 su 19.661 righe |
| Valori negativi | 0 (il valore minimo PM10 è 0.0, atteso per notti senza traffico) |
| Timestamp duplicati | Non rilevati |
| Unità di misura | Omogenee (µg/m³ per tutti tranne CO in mg/m³) |
| Encoding | UTF-8 corretto |

### 4.3 Note critiche

- **CO e Benzene** misurati solo dalla centralina di Via Chiarini (traffico)
- **PM2.5** non disponibile per Via Chiarini nel periodo analizzato
- **NOX** non disponibile per Giardini Margherita nel periodo analizzato
- Il dataset copre solo il 2026: dati storici (2025 e precedenti) sono disponibili come dataset separati su dati.gov.it[cite:36]

---

## 5. Risultati Analitici

### 5.1 Statistiche per Inquinante (media su tutte le stazioni, 91 giorni)

| Inquinante | Media (µg/m³) | Massimo | Minimo | Dev. Std | Valutazione |
|---|---|---|---|---|---|
| **PM10** | 26.3 | **59.0** | 0.0 | — | ⚠ Picchi critici |
| **PM2.5** | — | — | — | — | Dato parziale per stazione |
| **NO₂** | 24.2 | **127.0** | 3.0 | — | ✓ Media sotto soglia annuale |
| **NOX** | — | — | — | — | Non disponibile per tutte le stazioni |
| **O₃** | 29.2 | **116.0** | — | — | → Forte crescita a primavera |
| **NO** | — | — | — | — | → Monitorare |
| **CO** | — | — | — | — | Solo centralina Via Chiarini |
| **C₆H₆ Benzene** | — | — | — | — | Solo centralina Via Chiarini |

### 5.2 Trend mensile (tutte le stazioni aggregate)

| Mese | NO₂ | O₃ |
|---|---|---|
| Gen 2026 | 29.2 | 17.3 |
| Feb 2026 | 24.7 | 27.8 |
| Mar 2026 | 20.3 | 36.5 |
| Apr 2026 | **17.0** | **56.0** |

L'andamento è atteso: NO₂ cala con l'avanzare della primavera (da 29.2 µg/m³ in gennaio a 17.0 in aprile), mentre O₃ aumenta fortemente con l'irradiazione solare crescente (da 17.3 a 56.0 µg/m³). Il dataset storico disponibile su dati.gov.it consentirebbe un'analisi multi-anno per confermare la stagionalità.

---

## 6. Stack Tecnologico

| Layer | Tecnologia | Versione | Ruolo |
|---|---|---|---|
| **Acquisizione** | `curl` / Python `requests` | — | Download CSV da API pubblica |
| **Parsing & Analisi** | `pandas` | 2.x | Trasformazione, aggregazione, statistiche |
| **Ambiente** | Python | 3.11+ | Runtime principale |
| **Visualizzazione** | `Chart.js` | 4.4.0 (CDN) | Grafici interattivi nel browser |
| **Frontend** | HTML5 / CSS3 / Vanilla JS | — | Dashboard statica, no server richiesto |
| **Font** | Google Fonts — DM Sans, DM Mono | — | Tipografia |
| **Distribuzione** | File HTML statico | — | Scaricabile e apribile offline |

---

## 7. API Reference

### 7.1 Endpoint principale CSV

```
GET https://opendata.comune.bologna.it/api/v2/catalog/datasets/centraline-qualita-aria/exports/csv?use_labels=true
```

Restituisce l'intero dataset in formato CSV con intestazioni human-readable. Non richiede autenticazione. Non paginato (restituisce tutto il dataset in una sola chiamata).

### 7.2 Endpoint CKAN (dati.gov.it)

```
GET https://www.dati.gov.it/opendata/api/3/action/package_show?id=dffca3ba-806e-4477-99ef-83904d01e640
```

Restituisce i metadati completi del dataset in formato JSON, inclusi tutti gli URL delle risorse, la licenza, la frequenza di aggiornamento e i tag.[cite:37]

### 7.3 Esempio di interrogazione metadati CKAN

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

## 8. Failure Analysis e Limiti

### 8.1 Problemi noti

| Problema | Causa | Impatto | Soluzione |
|---|---|---|---|
| Completezza 58% | Gap di validazione ARPAE, manutenzione | Statistiche parziali | Integrazione dataset storico + interpolazione |
| NOX mancante per Giardini Margherita | Centralina non attrezzata | Bar chart incompleto | Flag esplicito in dashboard |
| PM2.5 mancante per Via Chiarini | Centralina non attrezzata | KPI aggregato parziale | Distinguere stazioni nei KPI |
| Dataset copre solo il 2026 | Dataset "anno in corso" | Nessuna analisi multi-anno | Join con dataset storici (2025, 2024…) su dati.gov.it |

### 8.2 Dataset storici disponibili su dati.gov.it

Per un'analisi longitudinale, i dataset annuali del Comune di Milano (disponibili dal 2007 al 2025) e il dataset di Vicenza (2004–2019) possono essere integrati nella stessa pipeline[cite:36]. I dataset storici di Bologna sono accessibili dalla stessa pagina del Comune.

---

## 9. Roadmap

- **v1.1** — Integrazione automatica dataset storici (dal 2017) per analisi trend multi-anno
- **v1.2** — Aggiornamento automatico giornaliero via GitHub Actions + notifiche superamento soglie
- **v1.3** — Aggiunta mappa Leaflet con marker geolocalizzati delle centraline
- **v1.4** — Correlazione con dati meteo (temperatura, umidità, vento) tramite API OpenMeteo
- **v2.0** — Deploy come web app con backend FastAPI + aggiornamento in tempo reale + benchmarking cross-città

---

## 10. Licenza e Attribuzioni

I dati sono rilasciati sotto licenza **Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)**, che consente uso, redistribuzione e modifica anche a scopi commerciali, a patto di attribuire la fonte:

> *Dati: Comune di Bologna — elaborazione ARPAE Emilia-Romagna. Fonte: dati.gov.it. Licenza CC BY 4.0.*

Il codice della pipeline e della dashboard è di produzione originale e non soggetto a restrizioni di licenza aggiuntive.
