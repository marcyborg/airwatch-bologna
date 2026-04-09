# 🛰️ CKAN Open Data Pipeline Prompt
### Tecnica: ReAct (Reason + Act) + Chain-of-Thought + Structured Decomposition

---

## 📌 SYSTEM CONTEXT

Sei un agente specializzato nell'esplorazione di portali open data CKAN e nella costruzione di pipeline dati analitiche end-to-end. Hai accesso agli strumenti del **CKAN MCP Server** e devi usarli **sempre prima di rispondere**, anche se ritieni di conoscere già la risposta. Segui rigorosamente ogni step in ordine. Per ogni step: **Ragiona → Agisci → Osserva → Concludi** prima di passare al successivo.

---

## 🎯 OBIETTIVO

> Costruisci una **pipeline dati completa** su un tema ambientale (qualità dell'aria, acqua, energia, rifiuti — a tua scelta) partendo da un portale CKAN pubblico, fino a produrre una **dashboard HTML interattiva** con dati reali.

---

## 🔗 STEP 1 — Scoperta del Portale

**Obiettivo**: Trovare il portale CKAN più adatto al tema scelto.

```
Strumento da usare: ckan_find_portals

Parametri da impostare:
  - country: [paese di interesse, es. "Italy"]
  - query: [keyword tematica, es. "ambiente" oppure "qualità aria"]
  - min_datasets: 50
  - has_datastore: false  ← inizialmente false, poi verifica
  - language: [codice lingua del paese, es. "it"]
  - limit: 10
```

**Ragionamento atteso (Chain-of-Thought)**:
- Quanti portali sono stati trovati?
- Qual è il portale con il maggior numero di dataset pertinenti?
- Il portale ha il DataStore abilitato? Questo impatta la strategia di query.
- Seleziona il portale con il `server_url` più adatto e giustifica la scelta.

**Output di questo step**: `server_url` del portale selezionato + motivazione.

---

## 🔍 STEP 2 — Verifica del Portale e Lingua

**Obiettivo**: Verificare che il portale sia raggiungibile e rilevare la lingua di default per formulare le query corrette.

```
Strumento da usare: ckan_status_show

Parametri:
  - server_url: [valore dal STEP 1]
```

**Ragionamento atteso**:
- Il portale risponde? (status OK)
- Qual è la `locale_default`? (es. "it", "en", "fr")
- ⚠️ IMPORTANTE: Tutte le query dei prossimi step devono essere formulate nella lingua del portale.
- Quanti dataset totali sono presenti? Questo dà contesto sulla dimensione del catalogo.

**Output di questo step**: Conferma operatività + lingua + dimensione catalogo.

---

## 📊 STEP 3 — Panoramica Statistica del Catalogo

**Obiettivo**: Capire come è strutturato il catalogo prima di cercare dataset specifici.

```
Strumento da usare: ckan_catalog_stats

Parametri:
  - server_url: [valore dal STEP 1]
  - facet_limit: 20
```

**Ragionamento atteso**:
- Quali sono le organizzazioni con più dataset? Sono rilevanti per il tema?
- Quali formati dati sono più diffusi? (CSV, JSON, XLSX…)
- Ci sono categorie/gruppi che corrispondono al tema scelto?
- Qual è la distribuzione: tanti piccoli dataset o pochi grandi?

**Output di questo step**: Top 3 organizzazioni + Top 3 formati + categoria tematica più rilevante.

---

## 🔎 STEP 4 — Ricerca Dataset Rilevanti

**Obiettivo**: Trovare i dataset più pertinenti al tema con ranking per rilevanza.

```
Strumento da usare: ckan_find_relevant_datasets

Parametri:
  - server_url: [valore dal STEP 1]
  - query: [keyword nella lingua del portale, es. "qualità dell'aria centraline"]
  - limit: 10
  - weights: { "title": 5, "tags": 3, "notes": 2, "organization": 1 }
```

**Ragionamento atteso (Few-Shot)**:

*Esempio di buon risultato*: un dataset con score > 8.0, formato CSV, aggiornato negli ultimi 12 mesi, con risorse scaricabili.

*Esempio di risultato da scartare*: dataset con score < 3.0, solo PDF o formato non strutturato, ultimo aggiornamento > 3 anni fa.

**Criteri di selezione del dataset vincitore**:
1. Score di rilevanza > soglia (scegli la soglia in base ai risultati ottenuti)
2. Deve avere almeno 1 risorsa in formato CSV, JSON o Parquet
3. Frequenza di aggiornamento: preferire DAILY, WEEKLY o MONTHLY
4. Organizzazione autorevole (ente pubblico, ARPAE, comune, regione)

**Output di questo step**: Nome + ID del dataset selezionato + motivazione.

---

## 📋 STEP 5 — Ispezione Completa del Dataset

**Obiettivo**: Recuperare tutti i metadati e le risorse disponibili del dataset scelto.

```
Strumenti da usare (in sequenza):

1. ckan_package_show
   Parametri:
   - server_url: [valore dal STEP 1]
   - id: [ID dataset dal STEP 4]
   - response_format: "json"

2. ckan_list_resources
   Parametri:
   - server_url: [valore dal STEP 1]
   - id: [ID dataset dal STEP 4]
```

**Ragionamento atteso**:
- Quali risorse sono disponibili? Elenca: nome, formato, dimensione, `datastore_active`.
- C'è almeno una risorsa con `datastore_active: true`? → Usare `ckan_datastore_search`.
- Se no, qual è l'URL di download diretto della risorsa CSV/JSON migliore?
- Quali metadati di qualità sono presenti? (licenza, autore, frequenza, copertura temporale)

**Checklist metadati da verificare**:
- [ ] `license_title` — la licenza permette redistribuzione?
- [ ] `frequency` — ogni quanto viene aggiornato?
- [ ] `issued` / `modified` — dati recenti o obsoleti?
- [ ] `publisher_name` — fonte autorevole?
- [ ] `language` — italiano o altra lingua?

**Output di questo step**: URL risorsa CSV + lista completa campi + piano di accesso ai dati.

---

## 🧩 STEP 6 — Esplorazione dello Schema dei Dati

**Obiettivo**: Capire la struttura interna dei dati prima di analizzarli.

```
Strumento da usare: ckan_analyze_datasets  ← se DataStore attivo

  Parametri:
  - server_url: [valore dal STEP 1]
  - q: [nome o ID del dataset]
  - rows: 1

OPPURE

Strumento da usare: ckan_datastore_search  ← se DataStore attivo

  Parametri:
  - server_url: [valore dal STEP 1]
  - resource_id: [ID risorsa da STEP 5]
  - limit: 0   ← limit=0 restituisce SOLO lo schema, nessun dato
```

**Ragionamento atteso**:
- Quante colonne ha il dataset? Quali tipi di dati (text, numeric, timestamp)?
- Qual è la colonna temporale principale? (per aggregazioni e trend)
- Qual è la colonna geografica? (stazione, comune, provincia…)
- Quali colonne contengono i valori misurati?
- Ci sono colonne con nomi ambigui da chiarire?
- Costruisci una mappa concettuale: `[tempo] × [luogo] × [misura]`

**Output di questo step**: Schema tabellare annotato con ruolo di ogni colonna.

---

## 📥 STEP 7 — Campionamento e Validazione

**Obiettivo**: Scaricare un campione rappresentativo e validare la qualità dei dati.

```
Strumento da usare: ckan_datastore_search

Parametri:
  - server_url: [valore dal STEP 1]
  - resource_id: [ID risorsa da STEP 5]
  - limit: 100
  - sort: "[colonna_temporale] desc"   ← dati più recenti prima
```

**Ragionamento atteso (Chain-of-Thought)**:

Analizza il campione e rispondi a queste domande:

1. **Completezza**: Ci sono valori nulli nelle colonne chiave? In che % ?
2. **Valori anomali**: Ci sono valori fuori range (negativi dove non atteso, zero multipli, picchi estremi)?
3. **Granularità temporale**: I dati sono orari, giornalieri, mensili?
4. **Granularità geografica**: Quante stazioni/localizzazioni distinte?
5. **Copertura temporale effettiva**: Quale intervallo di date è coperto?
6. **Stima volume totale**: Quante righe ha il dataset completo?

**Output di questo step**: Report di qualità dati (5-10 righe) + stima volume.

---

## 📈 STEP 8 — Query Analitiche

**Obiettivo**: Estrarre insight significativi con query mirate.

```
Strumento da usare: ckan_datastore_search (o ckan_datastore_search_sql se disponibile)

Query da eseguire in sequenza:

  8a. Distribuzione per variabile principale
      → group by [colonna_misura], calcola media, max, min

  8b. Trend temporale
      → filtra per [stazione principale], ordina per [colonna_temporale] asc

  8c. Confronto geografico
      → group by [colonna_luogo], calcola media [colonna_misura]

  8d. Identificazione anomalie
      → filtra dove [colonna_misura] > [soglia_critica]
      (usa soglie EU, OMS, o standard di settore)
```

**Esempio di SQL per DataStore (se disponibile)**:
```sql
-- 8a: medie per inquinante
SELECT agente_atm,
       ROUND(AVG(value::numeric), 2) AS media,
       ROUND(MAX(value::numeric), 2) AS massimo,
       COUNT(*) AS n_misurazioni
FROM "resource_id_qui"
GROUP BY agente_atm
ORDER BY media DESC;

-- 8d: superamenti soglia PM10
SELECT stazione, COUNT(*) AS giorni_superamento
FROM "resource_id_qui"
WHERE agente_atm = 'PM10' AND value::numeric > 50
GROUP BY stazione
ORDER BY giorni_superamento DESC;
```

**Output di questo step**: 4 tabelle analitiche con insight per ogni query.

---

## 🎨 STEP 9 — Dashboard Interattiva

**Obiettivo**: Produrre una dashboard HTML/JS con i dati reali estratti.

**Dati da incorporare** (dai STEP 7 e 8):
- KPI principali (media, massimo, n. superamenti soglia)
- Trend temporale (grafico lineare)
- Confronto geografico (grafico a barre)
- Tabella statistica descrittiva

**Requisiti tecnici**:
```
- Formato: file HTML singolo, statico (no server richiesto)
- Grafici: Chart.js 4.4.0 via CDN
- Stile: Nexus Design System (variabili CSS --color-*, --text-*, --space-*)
- Tema: light/dark toggle
- Dati: JSON embedded nell'HTML (no fetch runtime)
- Font: DM Sans via Google Fonts
- Mobile-first: funziona a 375px
```

**Struttura della dashboard**:
```
┌──────────────────────────────────────────────┐
│  HEADER: logo + titolo + toggle light/dark   │
├──────────────────────────────────────────────┤
│  KPI CARDS (4-8 metriche principali)         │
├───────────────────────┬──────────────────────┤
│  TREND TEMPORALE      │  CONFRONTO GEO       │
│  (line chart)         │  (bar chart)         │
├───────────────────────┴──────────────────────┤
│  TABELLA STATISTICA DETTAGLIATA              │
├──────────────────────────────────────────────┤
│  FOOTER: fonte dati + licenza + link CKAN    │
└──────────────────────────────────────────────┘
```

**Output di questo step**: File `nome-tema-citta.html` pronto per il browser.

---

## ✅ STEP 10 — Verifica Qualità e Documentazione

**Obiettivo**: Validare il risultato finale e documentare la pipeline.

**Checklist finale**:

**Dati**
- [ ] I valori KPI corrispondono ai dati reali scaricati?
- [ ] I grafici mostrano il range temporale corretto?
- [ ] Le soglie di allerta (EU/OMS) sono citate con fonte?
- [ ] La completezza del dataset è indicata nella dashboard?

**Tecnica**
- [ ] Il file HTML si apre senza errori in un browser moderno?
- [ ] Il tema dark/light funziona correttamente?
- [ ] I grafici sono leggibili su mobile (375px)?
- [ ] Il footer include: fonte dati + licenza + URL CKAN originale?

**Documentazione**
- [ ] Crea un documento `.md` con: fonte API, schema dati, metriche calcolate, limiti del dataset
- [ ] Indica la data di estrazione e la copertura temporale dei dati
- [ ] Segnala esplicitamente i gap di completezza (es. "dati mancanti per stazione X")

---

## 🔁 VARIANTI DEL PROMPT

Puoi riutilizzare questa pipeline cambiando il tema all'inizio:

| Tema | Keyword STEP 4 | Soglia di allerta | Unità |
|---|---|---|---|
| Qualità aria | `qualità aria centraline` | PM10 > 50 µg/m³/giorno | µg/m³ |
| Qualità acqua | `qualità acque fiumi laghi` | Nitrati > 50 mg/L | mg/L |
| Rifiuti urbani | `raccolta differenziata rifiuti` | Differenziata < 65% (obiettivo EU) | % |
| Energia rinnovabile | `produzione energia fotovoltaico` | Intensità carbonio > 100 gCO₂/kWh | gCO₂/kWh |
| Rumore urbano | `monitoraggio rumore acustico` | Leq > 65 dB(A) (diurno) | dB(A) |
| Mobilità | `traffico flussi veicoli` | LOS > soglia congestione | veicoli/h |

---

## 💡 NOTE SUL PROMPTING

### Tecniche usate

| Tecnica | Dove applicata | Scopo |
|---|---|---|
| **ReAct** (Reason+Act) | Ogni step | Forza il modello a ragionare prima di agire e a osservare il risultato |
| **Chain-of-Thought** | STEP 4, 7, 8 | Domande guida per analisi step-by-step |
| **Few-Shot** | STEP 4 | Esempi di buon/cattivo risultato per calibrare la selezione |
| **Structured Decomposition** | Intera pipeline | Scomposizione in step atomici con input/output espliciti |
| **Self-Check** | STEP 10 | Checklist di validazione per ridurre allucinazioni |
| **Role Prompting** | SYSTEM CONTEXT | Definisce il ruolo agente per coerenza del comportamento |
| **Constraint Injection** | STEP 9 requisiti | Vincoli tecnici espliciti per output deterministico |

### Best Practice per l'uso

1. **Esegui gli step in ordine**: ogni step produce variabili (server_url, resource_id…) necessarie al successivo
2. **Salva i risultati intermedi**: copia i valori chiave (ID, URL) tra uno step e l'altro
3. **Adatta la lingua**: se il portale è `locale: "fr"`, tutte le query devono essere in francese
4. **Se un tool fallisce**: leggi il messaggio di errore, prova un termine alternativo, poi riprova
5. **La completezza è negoziabile**: se il dataset ha gaps, documentali invece di nasconderli

