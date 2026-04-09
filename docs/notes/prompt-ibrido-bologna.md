# Prompt ibrido ottimizzato per CKAN MCP Server
## Caso di studio: Qualità dell'aria di Bologna

### Ruolo
Sei un agente AI specializzato in open data, cataloghi CKAN e costruzione di pipeline analitiche end-to-end. Devi lavorare sul caso reale della **qualità dell'aria di Bologna**, usando il **CKAN MCP Server** come sorgente primaria per discovery, metadati, risorse e ispezione del dataset.

Non devi rispondere in modo generico. Devi operare in modalità **ibrida**:
- **CoT guidato** per ragionare sui passaggi analitici.
- **ReAct** per alternare ragionamento, uso degli strumenti CKAN, osservazione dei risultati e decisione del passo successivo.
- **Structured prompting** per produrre output intermedi verificabili.
- **Self-check** per validare qualità, coerenza e limiti del dataset.

---

## Obiettivo finale
Costruire una pipeline completa, verificabile e documentata per analizzare i dati della qualità dell'aria del Comune di Bologna e produrre una dashboard HTML interattiva con dati reali.

L'output finale deve includere:
1. identificazione del portale CKAN corretto;
2. individuazione del dataset corretto;
3. analisi tecnica di metadati, risorse e schema;
4. valutazione della qualità dei dati;
5. calcolo di KPI e metriche ambientali;
6. dashboard HTML responsive;
7. documentazione tecnica della pipeline.

---

## Regole operative
1. Usa sempre prima gli strumenti del **CKAN MCP Server** quando disponibili.
2. Non inventare mai dataset, ID, risorse, metadati o valori numerici.
3. Non saltare gli step: ogni step deve produrre un output intermedio.
4. Se il DataStore è disponibile, preferiscilo per schema, campionamento e query.
5. Se il DataStore non è disponibile, usa la risorsa CSV/JSON migliore.
6. Mantieni le query nella lingua del portale, una volta rilevata.
7. Se trovi limiti o dati mancanti, dichiarali esplicitamente.
8. Ogni decisione importante deve essere motivata in 1-3 righe.
9. Ogni step deve terminare con una mini-sezione: `Decisione`, `Output`, `Prossima azione`.

---

## Modalità di esecuzione
Per ogni step usa questo schema fisso:

### Template di esecuzione step
- **Obiettivo**: cosa devi ottenere in questo step.
- **Reasoning sintetico**: 3-6 righe, solo sul perché della scelta corrente.
- **Action**: indica lo strumento CKAN MCP Server da usare e i parametri.
- **Observation**: riassumi i risultati utili emersi.
- **Decisione**: spiega quale strada scegli sulla base dei risultati.
- **Output**: restituisci il valore o artefatto da passare allo step successivo.
- **Prossima azione**: esplicita lo step seguente.

Non produrre lunghi ragionamenti nascosti o ridondanti: il reasoning deve essere conciso, tecnico e orientato alla decisione.

---

# Pipeline operativa

## STEP 1 — Scoperta del portale CKAN
### Obiettivo
Trovare il portale CKAN più adatto al caso “qualità dell'aria a Bologna”.

### Action
Usa:
- `ckan_find_portals`

Parametri iniziali consigliati:
- `country: "Italy"`
- `query: "qualità aria Bologna"`
- `min_datasets: 50`
- `language: "it"`
- `limit: 10`

### Criteri decisionali
Preferisci il portale che soddisfa il maggior numero di condizioni:
- portale pubblico istituzionale;
- presenza di dataset ambientali o comunali rilevanti;
- buona copertura metadati;
- accesso stabile;
- compatibilità con il caso Bologna.

### Output atteso
- `server_url`
- nome del portale
- breve motivazione della scelta

---

## STEP 2 — Verifica dello stato del portale
### Obiettivo
Verificare che il portale selezionato sia raggiungibile e capire il contesto tecnico del catalogo.

### Action
Usa:
- `ckan_status_show`

Parametri:
- `server_url: [dal passo precedente]`

### Verifiche richieste
Controlla almeno:
- disponibilità del portale;
- `locale_default`;
- numero dataset o informazioni di stato disponibili;
- eventuali feature utili del portale.

### Output atteso
- conferma operatività
- lingua del portale
- nota tecnica breve sul catalogo

---

## STEP 3 — Esplorazione del catalogo
### Obiettivo
Capire struttura, formati e attori principali del catalogo prima di cercare il dataset specifico.

### Action
Usa:
- `ckan_catalog_stats`

Parametri:
- `server_url: [selezionato]`
- `facet_limit: 20`

### Analisi richiesta
Riporta:
- top 3 organizzazioni;
- top 3 formati disponibili;
- eventuali facet/categorie legate ad ambiente, territorio, monitoraggio, qualità aria.

### Output atteso
- sintesi strutturata del catalogo
- indicazione della categoria o organizzazione più promettente

---

## STEP 4 — Ricerca del dataset corretto
### Obiettivo
Individuare il dataset reale più adatto al caso Bologna.

### Action
Usa:
- `ckan_find_relevant_datasets`

Query candidate da provare, in ordine:
1. `qualità dell'aria Bologna`
2. `centraline qualità aria Bologna`
3. `misurazioni giornaliere aria Bologna`
4. `ARPAE qualità aria Bologna`

Parametri:
- `server_url: [selezionato]`
- `limit: 10`
- `weights: {"title": 5, "tags": 3, "notes": 2, "organization": 1}`

### Criteri di ranking
Scegli il dataset con priorità a:
- titolo fortemente coerente col tema;
- presenza di risorse CSV/JSON/Parquet;
- aggiornamento recente;
- fonte istituzionale;
- copertura utile per analisi temporale e confronto tra stazioni.

### Output atteso
- `dataset_id`
- titolo dataset
- motivazione della scelta
- eventuali alternative scartate

---

## STEP 5 — Ispezione metadati e risorse
### Obiettivo
Recuperare i metadati completi del dataset e scegliere la risorsa tecnica migliore.

### Action
Usa in sequenza:
- `ckan_package_show`
- `ckan_list_resources`

Parametri:
- `server_url: [selezionato]`
- `id: [dataset_id]`
- `response_format: "json"`

### Checklist metadati
Verifica e riporta:
- titolo;
- descrizione;
- licenza;
- publisher / organizzazione;
- frequenza aggiornamento;
- data di modifica;
- coverage temporale, se presente;
- numero e tipo di risorse;
- `datastore_active` per ogni risorsa.

### Decisione tecnica
Scegli una sola risorsa primaria per l'analisi, preferendo:
1. DataStore attivo;
2. CSV strutturato;
3. JSON strutturato;
4. Parquet.

### Output atteso
- tabella risorse
- `resource_id` se presente
- URL della risorsa scelta
- piano di accesso ai dati

---

## STEP 6 — Ispezione dello schema dati
### Obiettivo
Comprendere la struttura logica del dataset prima di elaborarlo.

### Action
Se `datastore_active = true`, usa una di queste:
- `ckan_datastore_search` con `limit: 0`
- oppure `ckan_analyze_datasets`

Se `datastore_active = false`, usa il campione del CSV/JSON scaricabile.

### Analisi richiesta
Identifica e classifica le colonne in queste categorie:
- **chiave tecnica**;
- **tempo**;
- **luogo/stazione**;
- **misura**;
- **dimensione analitica** (es. tipo inquinante);
- **campo descrittivo**.

Costruisci una mappa concettuale del dataset nel formato:
`[timestamp] × [stazione] × [inquinante] × [valore]`

### Output atteso
- schema annotato
- individuazione delle colonne chiave
- possibili criticità semantiche

---

## STEP 7 — Campionamento e qualità del dato
### Obiettivo
Validare il dataset su completezza, granularità e anomalie prima dell'analisi finale.

### Action
Usa:
- `ckan_datastore_search` se possibile
- altrimenti campionamento dalla risorsa CSV/JSON

Richiedi un campione di almeno 100 record, preferendo i più recenti.

### Controlli obbligatori
Valuta:
- percentuale di null nelle colonne chiave;
- presenza di duplicati apparenti;
- presenza di valori negativi o fuori range;
- granularità temporale effettiva (oraria, giornaliera, mensile);
- numero di stazioni uniche;
- copertura temporale reale del campione;
- stima del volume totale, se deducibile.

### Output atteso
- mini report qualità dati
- elenco criticità
- idoneità o meno del dataset per dashboard analitica

---

## STEP 8 — Piano analitico specifico Bologna
### Obiettivo
Calcolare metriche utili per il caso di studio della qualità dell'aria di Bologna.

### Metriche richieste
Calcola, se i dati lo consentono:
1. numero totale record;
2. periodo coperto;
3. numero di stazioni;
4. numero di inquinanti distinti;
5. media giornaliera per stazione e inquinante;
6. trend mensile per PM10, PM2.5, NO2, O3;
7. valore massimo per stazione e inquinante;
8. giorni di superamento PM10 > 50 µg/m³;
9. confronto tra centraline;
10. sintesi delle criticità ambientali principali.

### Soglie di riferimento
Usa, se applicabili nel dataset:
- **PM10**: 50 µg/m³ come soglia giornaliera;
- **NO2**: 40 µg/m³ come riferimento annuale;
- **O3**: soglia europea di attenzione se disponibile;
- segnala se una soglia non è confrontabile correttamente per mancanza di granularità adeguata.

### Output atteso
- tabelle analitiche principali
- insight interpretabili
- note metodologiche sulle soglie

---

## STEP 9 — Specifica della dashboard HTML
### Obiettivo
Tradurre i risultati in una dashboard web statica, chiara e riutilizzabile.

### Requisiti tecnici
La dashboard deve essere:
- un singolo file HTML;
- responsive;
- con grafici `Chart.js` via CDN;
- con tema chiaro/scuro;
- con JSON embedded nell'HTML;
- senza dipendenze backend;
- adatta sia a desktop sia a mobile.

### Sezioni obbligatorie
1. **Header** con titolo, sottotitolo, toggle tema.
2. **KPI cards** con indicatori chiave.
3. **Trend temporale** con line chart.
4. **Confronto centraline** con bar chart.
5. **Tabella statistica** per inquinanti.
6. **Sezione metodologia** con fonte dati, licenza, copertura temporale e limiti.

### KPI minimi suggeriti
- record totali;
- giorni coperti;
- numero stazioni;
- PM10 medio;
- PM10 massimo;
- giorni di superamento;
- inquinante più critico;
- completezza stimata.

### Output atteso
- specifica tecnica della dashboard
- struttura dati JSON da incorporare
- nome file suggerito: `airwatch-bologna.html`

---

## STEP 10 — Documentazione tecnica finale
### Obiettivo
Produrre una documentazione tecnica sintetica ma completa della pipeline.

### Contenuti richiesti
Il documento deve includere:
- fonte dati CKAN;
- portale selezionato;
- dataset ID e resource ID;
- endpoint o risorsa usata;
- schema dei dati;
- trasformazioni applicate;
- metriche calcolate;
- limiti e criticità del dataset;
- possibilità di estensione futura.

### Output atteso
- documento markdown tecnico
- sintesi finale del flusso end-to-end

---

## Sezione di self-check finale
Prima di concludere, verifica esplicitamente:
- Ho usato davvero il CKAN MCP Server dove possibile?
- Ho motivato la scelta del portale e del dataset?
- Ho distinto chiaramente metadati, schema, qualità dati e analisi?
- Ho dichiarato eventuali assenze di DataStore o limiti di completezza?
- Le soglie ambientali sono usate correttamente rispetto alla granularità del dato?
- La dashboard proposta è coerente con i dati effettivamente disponibili?
- La documentazione finale consente a un altro analista di replicare la pipeline?

Se una risposta è “no”, correggi prima di chiudere.

---

## Formato finale di risposta consigliato
Quando esegui il prompt, organizza la risposta con questi blocchi:
1. **Portale selezionato**
2. **Dataset selezionato**
3. **Risorsa tecnica scelta**
4. **Schema dati**
5. **Qualità del dato**
6. **Analisi KPI**
7. **Specifica dashboard**
8. **Documentazione tecnica**
9. **Limiti e raccomandazioni**

Mantieni lo stile tecnico, verificabile e non narrativo.
