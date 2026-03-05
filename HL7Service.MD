# Product Requirements Document
# Servizio HL7 - Dispatcher Preparazioni IV in Farmacia Ospedaliera

**Versione**: 1.8
**Data**: 2026-03-05
**Stato**: Implementato

---

## Changelog

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | 2026-03-03 | Prima release |
| 1.1 | 2026-03-03 | Correzioni parser HL7 v2 (campi RXE), convenzione italiana RXO, segmenti RXC, concentrazione finale calcolata, normalizzazione alias categorie, fix contatori coda cappe, generatore prescrizioni di test casuali, colonne dashboard aggiornate |
| 1.2 | 2026-03-03 | Aggiunto supporto formato CDA-PrF (HL7 CDA Release 2.0 Prescrizione Farmaceutica v2.3, standard italiano DPR 26/03/2008); aggiunta opzione CDA nel generatore prescrizioni di test; aggiornata auto-detection formato |
| 1.3 | 2026-03-04 | Nuovi attributi cappa: tipologia (CappaType), stato operativo (CappaStatus), capacità massima coda (maxQueueSize), descrizione. Routing eligibility aggiornata per escludere cappe non-ONLINE e cappe con coda piena. UI cappe estesa con status badge colorati, select tipologia, campo max coda, modal arricchito |
| 1.4 | 2026-03-04 | Nuova pagina Web UI `/output.html` per configurazione campi output JSON. Endpoint `GET/PUT /api/config/output-fields`. Nuovi campi root in DispatchResult: `sourceFormat`, `prescribedBy`, `notes`. Il filtro output è applicato solo a `POST /api/prescriptions` (la dashboard interna usa sempre tutti i dati) |
| 1.5 | 2026-03-04 | Informazioni complete della cappa in `assignedCappa` dell'output: aggiunto `description`, `type`, `status`, `specializations`, `queueLength`, `maxQueueSize` |
| 1.6 | 2026-03-04 | Tracciamento consegna API: campo `deliveryStatus` (PENDING → SENT) e `timestamps.sentToApi` su ogni prescrizione. Filtro `GET /api/prescriptions?status=SENT\|PENDING`. Aggiornata pagina Campi Output con i due nuovi campi |
| 1.7 | 2026-03-04 | `POST /api/prescriptions` restituisce solo `HTTP 201` senza body (ricezione pura da sistemi sorgente). Filtro campi output rimosso dal POST e applicato esclusivamente ai GET. Aggiunto query param `cappaId` per filtrare per cappa. Transizione `deliveryStatus` PENDING→SENT avviene dopo l'invio della risposta HTTP (via `res.on('finish')`) — il client riceve sempre lo stato reale al momento della lettura |
| 1.8 | 2026-03-05 | Persistenza completa su MySQL 8 via TypeORM (sostituisce `data/config.json` e le strutture in-memory). Aggiunto container `hl7_mysql` nel Docker Compose. Nuovo schema database strutturato in 5 sezioni: anagrafiche (`ana_*`), entità, associazioni, configurazione, operativa. Tutte le tabelle hanno `id` INT AUTO_INCREMENT come chiave primaria; le chiavi naturali (`code`, `field_path`) promosse a UNIQUE. Aggiunto file `.env` per configurazione connessione DB in sviluppo locale. |

---

## 1. Obiettivo del Prodotto

Sviluppare un servizio software on-premise che funga da intermediario tra i sistemi informativi ospedalieri (cartelle cliniche, sistemi di prescrizione) e le postazioni di preparazione farmaci (cappe) in farmacia ospedaliera.

Il servizio riceve prescrizioni di farmaci in formato standard sanitario, le normalizza, le filtra in base a regole configurabili e le instrada verso la cappa di preparazione più adeguata, restituendo un output JSON strutturato pronto per il consumo via API.

---

## 2. Contesto e Problema

Le farmacie ospedaliere ricevono prescrizioni da reparti diversi attraverso sistemi informativi eterogenei che parlano protocolli differenti (HL7 v2, FHIR). Le prescrizioni di farmaci per via endovenosa (preparazioni IV) richiedono una lavorazione manuale da parte di farmacisti specializzati in postazioni dedicate (cappe a flusso laminare).

**Problemi attuali:**
- Sistemi sorgente parlano protocolli diversi e non compatibili tra loro
- Nessuna logica automatica di smistamento tra le cappe
- Difficoltà nel gestire le priorità (urgenze STAT vs routine)
- Farmaci specifici (es. chemioterapici) richiedono cappe dedicate per sicurezza
- Assenza di visibilità in tempo reale sul carico di lavoro per cappa

---

## 3. Utenti Target

| Ruolo | Utilizzo |
|-------|----------|
| Farmacista responsabile | Configura filtri, cappe e strategie di routing |
| Farmacista preparatore | Riceve le prescrizioni sulla propria postazione (cappa) |
| Tecnico informatico | Integra il servizio con i sistemi ospedalieri via API |
| Amministratore di sistema | Deploy, monitoraggio, configurazione infrastruttura |

---

## 4. Requisiti Funzionali

### 4.1 Ricezione Prescrizioni (Input)

Il servizio deve accettare prescrizioni in ingresso in quattro formati:

#### 4.1.1 HL7 v2.x (pipe-delimited)
- Messaggi tipo: `ORM^O01` (Pharmacy Order), `RDE^O11` (Encoded Order)
- Segmenti obbligatori: `MSH`, `PID`, `ORC`, `RXO` o `RXE`
- Segmenti opzionali: `PV1`, `RXR`, `RXC`, `NTE`, `TQ1`
- Separatori standard: `|` campo, `^` componente, `~` ripetizione

**Mapping segmenti → dati normalizzati:**

| Segmento | Campo | Dato estratto |
|----------|-------|---------------|
| MSH.7 | Data/ora messaggio | `requestedAt` |
| PID.3 / PID.2 | Patient ID | `patient.id` |
| PID.5.1, PID.5.2 | Cognome, nome paziente | `patient.name` |
| PV1.3.1, PV1.3.2 | Reparto, letto | `patient.ward`, `patient.bedNumber` |
| TQ1.9 / ORC.7.6 | Priorità ordine | `priority` |
| ORC.12.2, ORC.12.3 | Cognome, nome prescrittore | `prescribedBy` |
| RXE.2.1, RXE.2.2 | Codice e nome farmaco | `drug.code`, `drug.name` |
| RXE.3 | Give Amount - Minimum (quantità farmaco) | `drug.dosageValue` |
| RXE.5.1 | Give Units (unità dosaggio) | `drug.dosageUnit` |
| RXE.23 | Give Rate Amount (velocità infusione - valore) | `drug.infusionRate` |
| RXE.24.1 | Give Rate Units (velocità infusione - unità) | `drug.infusionRate` |
| RXO.1.1, RXO.1.2 | Codice e nome farmaco | `drug.code`, `drug.name` |
| RXR.1.1, RXR.1.2 | Via di somministrazione | `drug.route` |
| RXC[B].2, RXC[B].3, RXC[B].4 | Solvente, volume, unità (componente Base) | `drug.solvent`, `drug.volume` |
| RXC[A].3, RXC[A].4 | Quantità e unità farmaco (componente Additive) | `drug.dosageValue`, `drug.dosageUnit` |
| TQ1.3.1 / RXE.1.2 | Frequenza somministrazione | `drug.frequency` |
| NTE.3 | Note aggiuntive | `notes` |

**Convenzione italiana RXO (rilevamento automatico):**

I sistemi informativi italiani usano spesso una convenzione non standard per i campi RXO:

| Campo | Convenzione standard | Convenzione italiana |
|-------|---------------------|----------------------|
| RXO.2 | Give Amount Min (dose) | Dose |
| RXO.3 | Give Amount Max | Unità dosaggio (es. `mg`, `ml`) |
| RXO.4 | Give Units | Solvente (es. `NaCl 0.9%`) |
| RXO.5 | — | Volume (es. `250ml`) |

Il parser rileva automaticamente la convenzione: se `RXO.3` contiene un'unità farmaceutica riconosciuta (`mg`, `g`, `ml`, `UI`, ecc.) usa la convenzione italiana; altrimenti usa lo standard internazionale.

**Cascata fallback per solvente e volume:**
1. Segmento `RXC` tipo `B` (Base component) → fonte primaria
2. `RXO.4` / `RXO.5` (convenzione italiana)
3. Segmento `NTE.3` (note libere — pattern matching su "NaCl 0.9%", "Glucosio 5%", ecc.)

#### 4.1.2 FHIR R4 JSON
- Risorsa target: `MedicationRequest`
- Supporto Bundle FHIR contenente MedicationRequest
- Content-Type: `application/json` o `application/fhir+json`

**Mapping FHIR → dati normalizzati:**

| Campo FHIR | Dato estratto |
|------------|---------------|
| `subject.reference` | `patient.id` |
| `subject.display` | `patient.name` |
| `encounter.display` / extension `ward` | `patient.ward` |
| `priority` (routine/urgent/stat) | `priority` |
| `medicationCodeableConcept.text` | `drug.name` |
| `medicationCodeableConcept.coding[0].code` | `drug.code` |
| `dosageInstruction[0].route.coding[0].code` | `drug.route` (SNOMED CT) |
| `dosageInstruction[0].doseAndRate[0].doseQuantity.value` | `drug.dosageValue` |
| `dosageInstruction[0].doseAndRate[0].doseQuantity.unit` | `drug.dosageUnit` |
| `dosageInstruction[0].rateQuantity` / `rateRatio` | `drug.infusionRate` |
| `dosageInstruction[0].timing.code.text` | `drug.frequency` |
| extension `solvent` | `drug.solvent` |
| extension `volume` | `drug.volume` |
| `requester.display` | `prescribedBy` |
| `note[0].text` | `notes` |

#### 4.1.3 FHIR R4 XML
- Stessa risorsa e logica del formato JSON
- Content-Type: `application/xml` o `application/fhir+xml`
- Conversione interna XML → struttura JSON-compatibile prima del parsing (via `fast-xml-parser`)

#### 4.1.4 CDA-PrF (HL7 CDA Release 2.0 Prescrizione Farmaceutica)
- **Standard**: HL7 Italia — Prescrizione Farmaceutica CDA-PrF v2.3 (Maggio 2023), normativo ai sensi del DPR 26/03/2008
- **Template base**: POCD_MT000040 (HL7 CDA Release 2.0)
- **Content-Type**: `application/xml`
- **Elemento radice**: `<ClinicalDocument xmlns="urn:hl7-org:v3">`
- Parsing via `fast-xml-parser` con `removeNSPrefix: true`

**Struttura documento CDA-PrF:**
```
ClinicalDocument
├── recordTarget/patientRole          → dati paziente
│   └── patient/name (family + given) → patient.name
│   id[@extension] (OID Codice Fiscale / SSN) → patient.id
├── author/assignedAuthor             → prescribedBy
├── componentOf/encompassingEncounter
│   └── location/.../serviceProviderOrganization/name → patient.ward
├── component/structuredBody
│   └── component/section[code/@code="57828-6"]   (LOINC: Prescriptions)
│       └── entry/substanceAdministration
│           ├── priorityCode/@code    → priority (S=STAT, A=URGENT, R=ROUTINE)
│           ├── code/qualifier[@name="TP"]/@value → priority alternativa (ST/UE/RR)
│           ├── effectiveTime/period  → drug.frequency
│           ├── routeCode/@code       → drug.route
│           ├── doseQuantity          → drug.dosageValue, drug.dosageUnit
│           └── consumable/manufacturedProduct
│               └── manufacturedLabeledDrug/code
│                   ├── @code, @codeSystem AIC (2.16.840.1.113883.2.9.6.1.5) → drug.code (AIC)
│                   ├── translation[@codeSystem="...6.73"]/@code → drug.code (ATC, preferito)
│                   └── @displayName → drug.name
```

**Mapping CDA-PrF → dati normalizzati:**

| Percorso XPath (semplificato) | Dato estratto |
|-------------------------------|---------------|
| `recordTarget/patientRole/patient/name/family` + `.../given` | `patient.name` |
| `recordTarget/patientRole/id[@extension]` (CF preferito) | `patient.id` |
| `componentOf/.../serviceProviderOrganization/name` | `patient.ward` |
| `author/assignedAuthor/assignedPerson/name/family` | `prescribedBy` |
| `substanceAdministration/priorityCode/@code` (S/A/R) | `priority` |
| `substanceAdministration/code/qualifier[@name="TP"]/@value` (ST/UE/RR) | `priority` (alternativa) |
| `substanceAdministration/effectiveTime/period/@value` + `/@unit` | `drug.frequency` |
| `substanceAdministration/routeCode/@displayName` | `drug.route` |
| `substanceAdministration/doseQuantity/@value` + `/@unit` | `drug.dosageValue`, `drug.dosageUnit` |
| `manufacturedLabeledDrug/code/translation[@codeSystem="...6.73"]/@code` | `drug.code` (ATC, preferito) |
| `manufacturedLabeledDrug/code/@code` (AIC) | `drug.code` (fallback) |
| `manufacturedLabeledDrug/code/@displayName` | `drug.name` |
| `entryRelationship[@typeCode="SUBJ"]/act[code/@code="48767-8"]/text` | `drug.solvent`, `drug.volume`, `drug.infusionRate` (regex) |

**Nota solvente/volume/velocità infusione:**
Il template CDA-PrF v2.3 non vincola formalmente i campi solvente, volume e velocità di infusione. Il parser estrae questi dati dalla nota testuale prescrivente (relazione SUBJ, atto LOINC 48767-8) mediante pattern matching:
- Solvente: `NaCl 0.9%`, `Glucosio 5%`, `Ringer Lattato`, ecc.
- Volume: pattern `\d+\s*ml`
- Velocità: pattern `\d+\s*ml/h`

#### 4.1.5 Auto-detection del formato
Il servizio rileva automaticamente il formato del payload (ordine di valutazione):
1. Payload che inizia con `MSH|` → **HL7 v2**
2. Payload XML (`<` o `<?xml`) contenente `ClinicalDocument` → **CDA-PrF** *(valutato prima di FHIR XML)*
3. Payload XML contenente `MedicationRequest` o `Bundle` → **FHIR XML**
4. Payload JSON (`{`) con `resourceType` → **FHIR JSON**

### 4.2 Normalizzazione Interna

Indipendentemente dal formato sorgente, tutti i dati vengono convertiti nella struttura interna unificata `NormalizedPrescription`:

```
NormalizedPrescription {
  id: UUID                          // generato dal servizio
  sourceFormat: HL7V2 | FHIR_JSON | FHIR_XML | CDA_PRF
  patient: {
    id: string
    name: string
    ward: string
    bedNumber?: string
  }
  drug: {
    name: string
    code?: string                   // ATC o codice locale
    category: string                // vedere §4.3
    dosage: string                  // stringa formattata (es. "75 mg")
    dosageValue?: number            // valore numerico
    dosageUnit?: string             // unità (es. "mg")
    route: IV | IM | PO | SC | ...
    solvent?: string                // NaCl 0.9%, Glucosio 5%, ecc.
    volume?: string                 // stringa formattata (es. "250 ml")
    volumeValue?: number            // valore numerico
    volumeUnit?: string             // unità (es. "ml")
    infusionRate?: string           // es. "100 ml/h"
    finalConcentration?: string     // calcolata: dosageValue/volumeValue (es. "0.3 mg/ml")
    frequency: string
  }
  priority: STAT | URGENT | ROUTINE
  requestedAt: DateTime
  requiredBy?: DateTime
  prescribedBy?: string
  notes?: string
}
```

**Concentrazione finale calcolata:**
Quando sono disponibili sia `dosageValue` che `volumeValue`, il sistema calcola automaticamente la concentrazione finale della soluzione IV:
```
finalConcentration = dosageValue / volumeValue  [dosageUnit/volumeUnit]
Esempio: 75 mg / 250 ml = 0.3 mg/ml
```

### 4.3 Categorizzazione Automatica Farmaci

Il sistema classifica i farmaci in due modi, con precedenza al codice ATC:

1. **Per nome** (regex su nome farmaco): tabella di pattern matching
2. **Fallback**: categoria `OTHER`

| Categoria | Esempi farmaci |
|-----------|----------------|
| `CHEMOTHERAPY` | Methotrexate, Cisplatino, Carboplatino, Doxorubicina, Fluorouracile, Vincristina, Paclitaxel, Gemcitabina, Irinotecan, Oxaliplatino, Etoposide |
| `IMMUNOSUPPRESSANT` | Ciclosporina, Tacrolimus, Micofenolato, Azatioprina, Sirolimus, Everolimus |
| `ANTIBIOTIC` | Amoxicillina, Ampicillina, Cefazolina, Ceftriaxone, Vancomicina, Meropenem, Piperacillina, Metronidazolo, Ciprofloxacina, Levofloxacina |
| `ANTICOAGULANT` | Eparina, Warfarin, Enoxaparina, Fondaparinux, Dabigatran, Rivaroxaban |
| `NUTRITION` | Glucosio, Destrosio, Aminoacidi, Lipidi, TPN, Nutrizione parenterale, Kabiven, Nutriflex |
| `ANALGESIC_OPIOID` | Morfina, Fentanyl, Ossicodone, Tramadolo, Idromorfone, Remifentanil, Sufentanil |
| `INSULIN` | Insulina |
| `OTHER` | Tutti gli altri |

**Normalizzazione alias categorie (per routing):**

Le specializzazioni delle cappe e le condizioni dei filtri possono essere scritte in italiano o in inglese. Il routing engine normalizza automaticamente:

| Alias (italiano/sinonimo) | Categoria standard |
|---------------------------|--------------------|
| CHEMIOTERAPICI, CHEMIOTERAPICO, CHEMIO, ONCOLOGICI, ANTITUMORALI, CITOTOSSICI | CHEMOTHERAPY |
| IMMUNOSOPPRESSORI, IMMUNOSOPPRESSORE | IMMUNOSUPPRESSANT |
| ANTIBIOTICI, ANTIBIOTICO | ANTIBIOTIC |
| ANTICOAGULANTI, ANTICOAGULANTE | ANTICOAGULANT |
| NUTRIZIONE, NUTRIZIONE_PARENTERALE, NPT | NUTRITION |
| OPPIOIDI, OPPIOIDE, ANALGESICI, ANALGESICO | ANALGESIC_OPIOID |
| INSULINE, INSULINA | INSULIN |

### 4.4 Gestione Cappe

Le cappe sono le postazioni fisiche di preparazione farmaci in farmacia. Il sistema supporta:

- **Numero**: da 1 a N cappe configurabili dinamicamente
- **Attributi per cappa**:
  - `id`: identificativo univoco generato automaticamente (`CAPPA_XXXXXXXX`)
  - `name`: nome descrittivo (es. "Cappa Chemioterapici")
  - `description`: descrizione libera opzionale (es. note tecniche)
  - `type` (`CappaType`): tipologia della postazione
  - `active`: flag amministrativo — se `false` la cappa è esclusa dal routing e dalla UI
  - `status` (`CappaStatus`): stato operativo in tempo reale
  - `maxQueueSize`: numero massimo di preparazioni accettabili in coda; `0` = illimitata
  - `specializations`: lista di categorie farmaco associate (usano alias normalizzati)
  - `queue`: coda di lavoro in-memory con stati PENDING, IN_PROGRESS, COMPLETED
- **Operazioni**: creazione, modifica, attivazione/disattivazione, eliminazione
- **Coda**: ogni cappa mantiene una coda di preparazioni assegnate con stato
- **Contatori**: `GET /api/cappe` include la coda di ogni cappa per consentire il calcolo dei contatori in tempo reale nella dashboard

**Enum CappaType — tipologie supportate:**

| Valore | Descrizione |
|--------|-------------|
| `FLUSSO_LAMINARE_VERTICALE` | Cappa a flusso laminare verticale |
| `FLUSSO_LAMINARE_ORIZZONTALE` | Cappa a flusso laminare orizzontale |
| `ISOLATORE` | Isolatore farmaceutico |
| `BSC` | Cappa biologica (Biological Safety Cabinet) |
| `CHIMICA` | Cappa chimica |
| `DISPENSAZIONE` | Postazione di dispensazione |
| `ALTRO` | Altro (default) |

**Enum CappaStatus — stati operativi:**

| Valore | Descrizione |
|--------|-------------|
| `ONLINE` | Operativa e disponibile (default) |
| `OFFLINE` | Temporaneamente non disponibile |
| `MANUTENZIONE` | In manutenzione programmata |
| `GUASTO` | Fuori servizio |

**Eligibilità al routing:**
Una cappa riceve prescrizioni solo se tutte le seguenti condizioni sono soddisfatte:
1. `active = true` (flag amministrativo)
2. `status = ONLINE`
3. `maxQueueSize = 0` (illimitata) oppure `lunghezza_coda_attuale < maxQueueSize`

Se una cappa con coda piena viene specificata come target di un filtro, viene applicato il fallback alla strategia default (se `fallbackToDefault = true`).

### 4.5 Logica di Routing (Dispatcher)

Il dispatcher applica una logica a cascata per determinare la cappa destinataria:

#### Step 1 — Filtri specifici (valutati in ordine di priorità)
Ogni filtro ha:
- `priority`: numero intero (1 = massima priorità)
- `enabled`: abilitato/disabilitato
- `conditions`: criteri di corrispondenza (AND logico)
  - `drugCategories`: lista categorie farmaco (null = qualsiasi)
  - `ward`: reparto richiedente, match parziale case-insensitive (null = qualsiasi)
  - `urgency`: STAT o URGENT (null = qualsiasi)
- `targetCappaId`: cappa destinataria (null = usa strategia default)
- `fallbackToDefault`: se la cappa target non è attiva, usa la strategia default

**Logica di valutazione filtri:**
```
Per ogni filtro (ordinato per priority ASC):
  Se tutte le condizioni non-null corrispondono (AND):
    Se targetCappaId è valorizzato:
      Se la cappa è eleggibile (active=true, status=ONLINE, coda non piena) → DISPATCH sulla cappa
      Se la cappa non è eleggibile e fallbackToDefault=true → vai a Step 2
      Se la cappa non è eleggibile e fallbackToDefault=false → prova filtro successivo
    Se targetCappaId è null → vai a Step 2 con il filtro corrente applicato
Se nessun filtro corrisponde → Step 2
```

#### Step 2 — Strategia di routing default

Quattro strategie configurabili (default: `drug_type`):

| Strategia | Comportamento |
|-----------|---------------|
| `load_balance` | Assegna alla cappa attiva con il minor numero di preparazioni in coda non completate |
| `drug_type` | Trova le cappe con specializzazione corrispondente alla categoria farmaco (normalizzata); tra le cappe trovate applica load_balance; se nessuna corrisponde → load_balance su tutte |
| `urgency_first` | Per priorità STAT o URGENT: applica drug_type; altrimenti load_balance |
| `ward` | Assegna alla cappa con specializzazione che include il nome reparto; fallback a load_balance |

### 4.6 Output

#### 4.6.1 Risposta POST /api/prescriptions

Il `POST` è utilizzato dai sistemi sorgente (HIS, EHR, cartelle cliniche) per inviare prescrizioni al servizio. La risposta non contiene body — il sistema sorgente riceve solo il codice HTTP:

| Scenario | HTTP |
|----------|------|
| Prescrizione ricevuta e assegnata a cappa | `201 Created` |
| Body mancante o non leggibile | `400 Bad Request` + `{"error": "..."}` |
| Formato non riconosciuto | `400 Bad Request` + `{"error": "..."}` |
| Nessuna cappa disponibile | `400 Bad Request` + `{"error": "..."}` |
| Errore interno | `500 Internal Server Error` + `{"error": "..."}` |

#### 4.6.2 Risposta GET /api/prescriptions

I `GET` sono utilizzati dai software delle postazioni cappa (sistemi terzi) per leggere le preparazioni assegnate. La risposta è un array JSON con i soli campi configurati nella pagina **Campi Output** (vedere §4.7). Il filtro NON è applicato al POST.

**Comportamento `deliveryStatus`:**
- Al momento del `POST`: la prescrizione entra in stato `PENDING`
- Quando un `GET` viene chiamato: la risposta riporta `deliveryStatus: PENDING` (stato reale al momento della lettura); solo dopo l'invio della risposta HTTP il campo viene aggiornato a `SENT` e `timestamps.sentToApi` viene valorizzato

Struttura JSON completa (con tutti i campi selezionabili):

```json
{
  "prescriptionId": "uuid-v4",
  "status": "DISPATCHED",
  "deliveryStatus": "SENT",
  "priority": "STAT",
  "sourceFormat": "HL7V2",
  "prescribedBy": "Bianchi Luigi",
  "notes": "Methotrexate 75mg in NaCl 0.9% 250ml",
  "assignedCappa": {
    "id": "CAPPA_XXXXXXXX",
    "name": "Cappa Chemioterapici",
    "description": "Isolatore per citotossici ad alto rischio",
    "type": "ISOLATORE",
    "status": "ONLINE",
    "specializations": ["CHEMOTHERAPY"],
    "queueLength": 3,
    "maxQueueSize": 10
  },
  "routingInfo": {
    "appliedFilter": "Chemioterapici su Cappa 1",
    "fallbackUsed": false,
    "defaultStrategy": "drug_type"
  },
  "patient": {
    "id": "123456",
    "name": "Mario Rossi",
    "ward": "ONCOLOGIA",
    "bedNumber": "12A"
  },
  "preparation": {
    "drug": "Methotrexate",
    "category": "CHEMOTHERAPY",
    "code": "L01BA01",
    "dosage": "75 mg",
    "dosageValue": 75,
    "dosageUnit": "mg",
    "route": "IV",
    "solvent": "NaCl 0.9%",
    "volume": "250 ml",
    "volumeValue": 250,
    "volumeUnit": "ml",
    "infusionRate": "100 ml/h",
    "finalConcentration": "0.3 mg/ml",
    "frequency": "Once"
  },
  "timestamps": {
    "received": "2024-03-15T14:30:00.000Z",
    "dispatched": "2024-03-15T14:30:00.123Z",
    "sentToApi": "2024-03-15T14:30:00.456Z",
    "requiredBy": "2024-03-15T16:00:00.000Z"
  }
}
```

**Campi output configurabili:**
Tramite la pagina Web UI "Campi Output" (o l'API `PUT /api/config/output-fields`) è possibile selezionare i campi da includere nella risposta dei `GET /api/prescriptions`. Il filtro è applicato a tutti i GET; il POST non restituisce JSON. I campi sono identificati tramite dot-notation:

I campi sono identificati tramite dot-notation:

| Gruppo | Campi |
|--------|-------|
| Generale | `prescriptionId`*, `status`*, `priority`, `sourceFormat`, `prescribedBy`, `notes`, `deliveryStatus` |
| Cappa Assegnata | `assignedCappa.id`*, `assignedCappa.name`*, `assignedCappa.description`, `assignedCappa.type`, `assignedCappa.status`, `assignedCappa.specializations`, `assignedCappa.queueLength`, `assignedCappa.maxQueueSize` |
| Routing | `routingInfo.appliedFilter`, `routingInfo.fallbackUsed`, `routingInfo.defaultStrategy` |
| Paziente | `patient.id`, `patient.name`, `patient.ward`, `patient.bedNumber` |
| Preparazione | `preparation.drug`, `preparation.category`, `preparation.code`, `preparation.dosage`, `preparation.route`, `preparation.solvent`, `preparation.volume`, `preparation.infusionRate`, `preparation.finalConcentration`, `preparation.frequency` |
| Timestamp | `timestamps.received`, `timestamps.dispatched`, `timestamps.sentToApi`, `timestamps.requiredBy` |

\* Campo obbligatorio (sempre incluso, non disattivabile)

### 4.7 Interfaccia di Configurazione

#### 4.7.1 Web UI
Pannello amministrativo browser-based accessibile via HTTP, composto da 5 pagine:

| Pagina | URL | Funzionalità |
|--------|-----|--------------|
| Dashboard | `/` | Stato cappe con contatori coda in tempo reale (con status badge colorato, tipologia, coda/max), ultime prescrizioni (dosaggio, contenitore finale), form di test con generatore casuale |
| Cappe | `/cappe.html` | CRUD cappe con tutti gli attributi: nome, tipologia, descrizione, specializzazioni, stato operativo, capacità massima coda; status badge colorati |
| Filtri | `/filtri.html` | CRUD filtri di routing, impostazione condizioni e priorità |
| Configurazione | `/config.html` | Selezione strategia default, visualizzazione config completa |
| Campi Output | `/output.html` | Selezione checkbox dei campi da includere nel JSON di risposta `POST /api/prescriptions`; anteprima JSON live aggiornata in tempo reale |

La dashboard si aggiorna automaticamente ogni 10 secondi.

**Colonne tabella ultime prescrizioni:**
ID | Priorità | Paziente | Reparto | Farmaco | Dosaggio | Contenitore Finale | Cappa Assegnata | Ricevuta

Il campo "Contenitore Finale" mostra: solvente + volume + concentrazione finale calcolata (in grigio).

**Generatore prescrizioni di test:**
La sezione test nella dashboard include un pulsante "Genera Casuale" che produce ad ogni click un payload valido e diverso per il formato selezionato (HL7 v2 / FHIR JSON / FHIR XML / CDA-PrF), randomizzando paziente, farmaco, dosaggio, reparto, priorità, solvente, volume e velocità di infusione.

I messaggi HL7 v2 generati usano il segmento RXE (Pharmacy Encoded Order) con segmenti RXC per la composizione IV, conformi allo standard HL7 v2.5.

I documenti CDA-PrF generati seguono il template POCD_MT000040 con sezione LOINC 57828-6, codici ATC/AIC, nota infusionale LOINC 48767-8 e priorità via `priorityCode` e qualifier TP.

#### 4.7.2 REST API di Configurazione

```
# Prescrizioni
POST   /api/prescriptions                        Riceve prescrizione (HL7v2/FHIR/CDA) → dispatch → HTTP 201 (no body)
GET    /api/prescriptions                        Lista prescrizioni filtrata (output fields applicato) → marca SENT
GET    /api/prescriptions?status=PENDING         Solo prescrizioni non ancora lette → marca SENT
GET    /api/prescriptions?status=SENT            Solo prescrizioni già consegnate
GET    /api/prescriptions?cappaId=CAPPA_XXX      Prescrizioni per cappa specifica → marca SENT
GET    /api/prescriptions?status=PENDING&cappaId=CAPPA_XXX  PENDING per cappa specifica → marca SENT
GET    /api/prescriptions/:id                    Dettaglio singola prescrizione → marca SENT

# Cappe
GET    /api/cappe                  Lista tutte le cappe (include coda di ogni cappa)
GET    /api/cappe/:id              Dettaglio cappa con coda
POST   /api/cappe                  Crea nuova cappa (name, description, type, status, maxQueueSize, specializations)
PUT    /api/cappe/:id              Modifica cappa (tutti gli attributi)
DELETE /api/cappe/:id              Elimina cappa
GET    /api/cappe/:id/queue        Coda lavori della cappa

# Configurazione routing
GET    /api/config                 Configurazione completa
PUT    /api/config/strategy        Imposta strategia default
GET    /api/config/filters         Lista filtri ordinati per priorità
POST   /api/config/filters         Aggiunge filtro
PUT    /api/config/filters/:id     Modifica filtro
DELETE /api/config/filters/:id     Elimina filtro

# Configurazione campi output
GET    /api/config/output-fields   Restituisce lista campi abilitati (null = tutti)
PUT    /api/config/output-fields   Imposta campi abilitati { "enabledFields": ["prescriptionId", "assignedCappa.id", ...] | null }
```

**Note endpoint output-fields:**
- `enabledFields: null` → tutti i campi inclusi (nessun filtro)
- `enabledFields: []` → array vuoto equivale a null (nessun filtro)
- I campi obbligatori (`prescriptionId`, `status`, `assignedCappa.id`, `assignedCappa.name`) sono sempre inclusi nell'output indipendentemente dalla configurazione

### 4.8 Persistenza

Dalla v1.8 tutta la persistenza è affidata a un database **MySQL 8** gestito via **TypeORM**. Il file `data/config.json` non è più la fonte di verità a regime (rimane solo come riferimento storico del seed iniziale).

| Dato | Meccanismo | Tabella/i |
|------|-----------|-----------|
| Configurazione cappe | DB, caricata in cache al boot | `cappe`, `cappa_specializations` |
| Filtri di routing | DB, caricata in cache al boot | `routing_filters` |
| Strategia default + output fields | DB, singleton | `app_config`, `app_config_output_fields` |
| Prescrizioni ricevute + dispatch result | DB, scritto ad ogni POST | `prescriptions` |
| Code di lavoro per cappa | DB + cache in-memory sincrona | `cappa_queue` |

**Flusso di avvio (`onModuleInit`):**
1. `ConfigService` legge da DB cappe, filtri e `app_config` e popola la cache in-memory
2. `CappeService` conta le voci `PENDING`/`IN_PROGRESS` nella `cappa_queue` per ogni cappa e inizializza la cache dei contatori
3. Da questo momento tutte le letture sincrone (RoutingEngine) usano la cache; tutte le scritture vanno sia in cache che su DB

**Capacità massima storico prescrizioni via API:** 200 elementi per risposta (limitato nel `findAll` con `.take(200)`); il DB non ha limiti.

---

## 5. Requisiti Non Funzionali

### 5.1 Deployment
- **Modalità**: On-premise, rete ospedaliera interna
- **Containerizzazione**: Docker + Docker Compose (due container: `hl7_mysql` + `hl7_service`)
- **Nessun dato esce dalla rete ospedaliera**
- Volume Docker `mysql_data` per persistenza del database MySQL
- Il container `hl7_service` attende l'health-check di `hl7_mysql` prima di avviarsi (`depends_on: condition: service_healthy`)

### 5.2 Performance
- Latenza di parsing e dispatching: < 100ms per messaggio
- Nessun limite di throughput definito per la v1.0 (traffico tipico farmacia: decine di prescrizioni/ora)

### 5.3 Sicurezza
- Il servizio opera su rete interna ospedaliera (non esposto su internet)
- Accesso consigliato tramite SSH tunnel per manutenzione remota
- CORS abilitato (configurabile per restringere origini)
- Nessuna autenticazione nella v1.0 (da implementare in v2.0 se richiesto)
- Nessun dato clinico viene persistito su disco (solo config tecnica)
- Le credenziali DB sono configurate tramite variabili d'ambiente (file `.env` in sviluppo, env Docker in produzione)

### 5.4 Disponibilità
- Riavvio automatico tramite Docker (`restart: unless-stopped`)
- Con la persistenza su DB, un riavvio del servizio non perde né la configurazione né le prescrizioni storiche né lo stato delle code

---

## 6. Stack Tecnologico

| Componente | Tecnologia | Versione |
|------------|------------|---------|
| Runtime | Node.js | 18+ |
| Framework | NestJS | 10.x |
| Linguaggio | TypeScript | 5.x |
| Parser HL7 v2 | simple-hl7 | 3.3.0 |
| Parser XML | fast-xml-parser | 4.x |
| Validazione DTO | class-validator + class-transformer | 0.14 / 0.5 |
| UUID | uuid | 9.x |
| File system | fs-extra | 11.x |
| **Database** | **MySQL 8.0** | **8.0** |
| **ORM** | **TypeORM** | **0.3.x** |
| **Driver DB** | **mysql2** | **3.x** |
| **Env config** | **dotenv** | — |
| Web UI | HTML5 + JavaScript Vanilla | — |
| Containerizzazione | Docker + Docker Compose | — |

---

## 7. Architettura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     SISTEMI SORGENTE                         │
│   Cartella Clinica (HL7 v2)    HIS/EHR (FHIR JSON/XML)     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP POST /api/prescriptions
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVIZIO HL7 (NestJS)                       │
│                                                              │
│  ┌──────────────┐    ┌───────────────────────────────────┐  │
│  │ Auto-Detect  │───▶│              PARSERS              │  │
│  │   Formato    │    │ HL7v2 │ FHIR JSON │ FHIR XML      │  │
│  └──────────────┘    │            CDA-PrF               │  │
│                      └─────────────┬─────────────────────┘  │
│                                    │ NormalizedPrescription  │
│                                    ▼                         │
│                      ┌─────────────────────────┐            │
│                      │    ROUTING ENGINE        │            │
│                      │  1. Filtri specifici     │            │
│                      │     (per priorità, AND)  │            │
│                      │  2. Strategia default    │            │
│                      │  Normalizzazione alias   │            │
│                      │  (IT/EN sinonimi cat.)   │            │
│                      └──────────┬──────────────┘            │
│                                 │                            │
│           ┌─────────────────────┼──────────────────────┐    │
│           ▼                     ▼                        ▼   │
│    ┌──────────────┐   ┌──────────────────┐   ┌────────────┐ │
│    │  CAPPA_001   │   │    CAPPA_002     │   │ CAPPA_00N  │ │
│    │ Chemioterapia│   │   Antibiotici    │   │  Generica  │ │
│    │  [queue: 3]  │   │    [queue: 1]    │   │ [queue: 0] │ │
│    └──────┬───────┘   └───────┬──────────┘   └─────┬──────┘ │
│           └─────────────────┬─┘─────────────────────┘        │
│                             │ TypeORM (mysql2)                │
│  ┌──────────────────────────┼──────────────────────────────┐ │
│  │  CONFIG CACHE (in-memory)│  caricata dal DB al boot      │ │
│  │  Cappe │ Filtri │ Strategia default │ Output fields      │ │
│  └──────────────────────────┴──────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ TypeORM (R/W)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MySQL 8 (hl7_mysql)                         │
│                                                              │
│  ANAGRAFICHE          ENTITÀ             CONFIGURAZIONE      │
│  ana_drug_categories  cappe              app_config          │
│  ana_drug_cat_aliases prescriptions      app_config_         │
│  ana_cappa_types                           output_fields     │
│  ana_cappa_statuses   ASSOCIAZIONI       routing_filters     │
│  ana_routing_strat.   cappa_special.                         │
│  ana_source_formats   routing_filter_    OPERATIVA           │
│  ana_priorities         drug_categories  cappa_queue         │
│  ana_output_fields                                           │
└─────────────────────────────────────────────────────────────┘
                       │ JSON output
                       ▼
            API Consumer / Postazione Cappa
```

---

## 8. Struttura del Progetto

```
servizio-hl7/
├── src/
│   ├── main.ts                              Entrypoint NestJS
│   ├── app.module.ts                        Modulo root + middleware body parser
│   ├── common/
│   │   └── dto/
│   │       └── normalized-prescription.dto.ts   DTO interno unificato
│   ├── database/
│   │   ├── database.module.ts               TypeORM forRootAsync — connessione MySQL
│   │   └── entities/
│   │       ├── cappa.entity.ts              Entità tabella `cappe`
│   │       ├── cappa-spec.entity.ts         Entità tabella `cappa_specializations`
│   │       ├── routing-filter.entity.ts     Entità tabella `routing_filters`
│   │       ├── app-config.entity.ts         Entità tabella `app_config`
│   │       ├── prescription.entity.ts       Entità tabella `prescriptions`
│   │       └── cappa-queue.entity.ts        Entità tabella `cappa_queue`
│   ├── parsers/
│   │   ├── parsers.module.ts
│   │   ├── parsers.service.ts               Auto-detect + orchestrazione
│   │   ├── hl7v2.parser.ts                  Parser HL7 v2 (RXO/RXE, RXC, conv. italiana)
│   │   ├── fhir-json.parser.ts              Parser FHIR MedicationRequest JSON
│   │   ├── fhir-xml.parser.ts               Parser FHIR XML (via fast-xml-parser)
│   │   └── cda-prf.parser.ts                Parser CDA-PrF HL7 Italia v2.3
│   ├── prescriptions/
│   │   ├── prescriptions.module.ts
│   │   ├── prescriptions.controller.ts      POST + GET /api/prescriptions
│   │   └── prescriptions.service.ts         Scrittura/lettura su DB (max 200 per GET)
│   ├── dispatcher/
│   │   ├── dispatcher.module.ts
│   │   ├── dispatcher.service.ts            Assembla DispatchResult
│   │   └── routing/
│   │       └── routing-engine.ts            Filtri + strategie + alias normalizzazione
│   ├── cappe/
│   │   ├── cappe.module.ts
│   │   ├── cappe.controller.ts              CRUD /api/cappe
│   │   └── cappe.service.ts                 Cache contatori coda + persistenza su DB
│   └── config/
│       ├── config.module.ts
│       ├── config.controller.ts             /api/config
│       └── config.service.ts               Lettura DB al boot, scrittura asincrona su ogni modifica
├── frontend/
│   ├── index.html                           Dashboard (con generatore test casuale)
│   ├── cappe.html                           Gestione cappe (tipo, stato, maxCoda, descrizione)
│   ├── filtri.html                          Gestione filtri routing
│   ├── config.html                          Configurazione strategia
│   ├── output.html                          Configurazione campi output JSON
│   └── assets/
│       ├── style.css
│       └── app.js                           Logic UI + generatore prescrizioni random
├── data/
│   └── config.json                          Seed storico (non più fonte di verità — sostituito dal DB)
├── .env                                     Variabili connessione DB per sviluppo locale (non in git)
├── .env.example → vedere DatabaseHL7/.env.example
├── HL7Service.MD                            Questo documento
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## 9. Schema Database

Il database `hl7service` (MySQL 8) è definito in `DatabaseHL7/schema.sql` ed è organizzato in 5 sezioni. Ogni tabella ha `id INT AUTO_INCREMENT` come chiave primaria; le chiavi naturali (`code`, `field_path`) sono promosse a vincolo `UNIQUE`.

### 9.1 ANAGRAFICHE — tabelle `ana_*`

Tabelle di riferimento a sola lettura (modificabili dall'amministratore, non dal flusso operativo).

| Tabella | PK | UNIQUE | Contenuto |
|---|---|---|---|
| `ana_drug_categories` | `id` | `code` | Categorie farmaco standard (CHEMOTHERAPY, ANTIBIOTIC, …) |
| `ana_drug_category_aliases` | `id` | `alias` | Sinonimi IT/EN → categoria standard (es. CHEMIOTERAPICI → CHEMOTHERAPY) |
| `ana_cappa_types` | `id` | `code` | Tipi cappa (ISOLATORE, BSC, FLUSSO_LAMINARE_VERTICALE, …) |
| `ana_cappa_statuses` | `id` | `code` | Stati operativi (ONLINE, OFFLINE, MANUTENZIONE, GUASTO) |
| `ana_routing_strategies` | `id` | `code` | Strategie dispatch con descrizione (load_balance, drug_type, …) |
| `ana_source_formats` | `id` | `code` | Formati messaggio (HL7V2, FHIR_JSON, FHIR_XML, CDA_PRF) |
| `ana_priorities` | `id` | `code` | Livelli priorità (STAT, URGENT, ROUTINE) |
| `ana_output_fields` | `id` | `field_path` | Catalogo completo campi esportabili con label e descrizione |

### 9.2 ENTITÀ — tabelle principali

| Tabella | PK | Contenuto |
|---|---|---|
| `cappe` | `id` VARCHAR (es. `CAPPA_6741F914`) | Cappe fisiche di preparazione |
| `prescriptions` | `id` VARCHAR UUID | Prescrizioni ricevute + snapshot dispatch completo (colonne indicizzate + JSON audit) |

### 9.3 ASSOCIAZIONI — tabelle relazionali

| Tabella | PK | Relazione |
|---|---|---|
| `cappa_specializations` | `id` INT | Cappa ↔ categoria farmaco (es. CAPPA_001 → CHEMOTHERAPY) |
| `routing_filter_drug_categories` | `id` INT | Filtro routing ↔ categoria farmaco (forma normalizzata del JSON `condition_drug_cats`) |
| `cappa_queue` | `id` INT | Prescrizioni in coda per cappa con stato PENDING / IN_PROGRESS / COMPLETED |

### 9.4 CONFIGURAZIONE

| Tabella | PK | Contenuto |
|---|---|---|
| `app_config` | `id` INT (singleton = 1) | Strategia default + array JSON output fields |
| `app_config_output_fields` | `id` INT | Campi output attivi (forma normalizzata, FK su `ana_output_fields`) |
| `routing_filters` | `id` VARCHAR UUID | Regole routing prioritizzate (condizioni AND, target cappa, fallback) |

### 9.5 Seed iniziale

I dati iniziali (cappe, specializzazioni, configurazione da `data/config.json`) e tutti i valori delle anagrafiche sono inseriti con `INSERT ... ON DUPLICATE KEY UPDATE` direttamente in `schema.sql`, che viene eseguito automaticamente dal container MySQL al primo avvio.

> **Nota specializzazioni**: le `specializations` delle cappe sono normalizzate a categoria standard al momento del seed (`CHEMIOTERAPICI` → `CHEMOTHERAPY`). Il routing engine esegue la stessa normalizzazione a runtime tramite `ana_drug_category_aliases`.

> **Nota `output_fields`**: `NULL` in `app_config.output_fields` significa nessun filtro (tutti i campi inclusi). Il `POST /api/prescriptions` non restituisce JSON, quindi il filtro si applica solo ai `GET`.

---

## 10. Avvio e Deploy

### Sviluppo locale

Prerequisito: container MySQL attivo (dalla cartella `DatabaseHL7/`).

```bash
# 1. Avvia il database Docker (porta 3307 per non collidere con MySQL locale)
cd DatabaseHL7/
docker compose up -d mysql

# 2. Avvia il servizio (legge .env per la connessione DB)
cd ../ServizioHL7/
npm install
npm run build
node dist/main.js
# oppure con ts-node
npx ts-node src/main.ts
```

Il file `.env` (non in git) deve essere presente in `ServizioHL7/`:
```
DB_HOST=localhost
DB_PORT=3307
DB_NAME=hl7service
DB_USER=hl7user
DB_PASSWORD=hl7password
PORT=3000
```

### Docker (produzione on-premise)

```bash
# Dalla cartella DatabaseHL7/ — avvia MySQL + servizio HL7 insieme
docker compose up -d
```

Il Docker Compose avvia `hl7_mysql` (porta 3306 interna) e `hl7_service` che vi si connette tramite il nome host `mysql` nella rete Docker interna.

### Accesso remoto (senza aprire porte)
```bash
ssh -L 3000:localhost:3000 utente@server-farmacia
# Poi aprire http://localhost:3000 nel browser locale
```

### Variabili d'ambiente

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `PORT` | `3000` | Porta HTTP del servizio |
| `NODE_ENV` | `development` | Ambiente di esecuzione |
| `DB_HOST` | `localhost` | Host del database MySQL |
| `DB_PORT` | `3306` | Porta del database MySQL |
| `DB_NAME` | `hl7service` | Nome del database |
| `DB_USER` | `hl7user` | Utente MySQL |
| `DB_PASSWORD` | `hl7password` | Password MySQL |

---

## 11. Esempi di Integrazione

### Invio prescrizione HL7 v2 (segmento RXE — standard farmacia)
```bash
curl -X POST http://farmacia-server:3000/api/prescriptions \
  -H "Content-Type: text/plain" \
  --data-binary $'MSH|^~\\&|HIS|OSP|FARMACIA|OSP|20240315143000||ORM^O01|001|P|2.5\r
PID|1||P123456^^^OSP^MR||Rossi^Mario||19650520|M\r
PV1|1|I|ONCOLOGIA^12^A||||DOC01^Bianchi^Luigi\r
ORC|NW|ORD001|||||^^^20240315143000^^S\r
RXE|^Once|L01BA01^Methotrexate^L|75||mg|IV||||||||||||||||||||||||100|ml/h\r
RXR|IV^Intravenosa\r
RXC|B|SOL^NaCl 0.9%^L|250|ml\r
RXC|A|L01BA01^Methotrexate^L|75|mg\r
TQ1|1|||Once|||||S\r
NTE|||Methotrexate 75mg in NaCl 0.9% 250ml'

# Risposta: HTTP 201 Created (nessun body)
```

### Lettura preparazioni PENDING per una cappa
```bash
# La postazione cappa legge le proprie preparazioni in attesa
curl http://farmacia-server:3000/api/prescriptions?status=PENDING&cappaId=CAPPA_XXXXXXXX

# La risposta riporta deliveryStatus=PENDING; dopo l'invio viene aggiornato a SENT
# La chiamata successiva con status=PENDING restituirà array vuoto []
```

### Invio prescrizione HL7 v2 (segmento RXO — convenzione italiana)
```bash
curl -X POST http://farmacia-server:3000/api/prescriptions \
  -H "Content-Type: text/plain" \
  --data-binary $'MSH|^~\\&|HIS|OSP|FARMACIA|OSP|20240315143000||ORM^O01|001|P|2.5\r
PID|1||123456|||Rossi^Mario\r
PV1|1|I|ONCOLOGIA^12^A\r
ORC|NW|ORD001\r
RXO|Methotrexate^Methotrexate^L|50|mg|NaCl 0.9%|250ml\r
RXR|IV^Intravenosa'
```

### Invio prescrizione FHIR JSON
```bash
curl -X POST http://farmacia-server:3000/api/prescriptions \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "MedicationRequest",
    "priority": "stat",
    "subject": {"reference": "Patient/P789", "display": "Verdi Giuseppe"},
    "encounter": {"display": "ONCOLOGIA"},
    "medicationCodeableConcept": {
      "text": "Cisplatino",
      "coding": [{"code": "L01XA01", "display": "Cisplatin", "system": "http://www.whocc.no/atc"}]
    },
    "dosageInstruction": [{
      "route": {"coding": [{"code": "47625008", "display": "Intravenous"}]},
      "timing": {"code": {"text": "Once"}},
      "doseAndRate": [{"doseQuantity": {"value": 75, "unit": "mg"}}],
      "rateQuantity": {"value": 100, "unit": "ml/h"}
    }],
    "extension": [
      {"url": "solvent", "valueString": "NaCl 0.9%"},
      {"url": "volume", "valueString": "500ml"}
    ]
  }'
```

### Invio prescrizione CDA-PrF (HL7 Italia)
```bash
curl -X POST http://farmacia-server:3000/api/prescriptions \
  -H "Content-Type: application/xml" \
  --data-binary '<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3">
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_MT000040"/>
  <code code="57833-6" codeSystem="2.16.840.1.113883.6.1" displayName="Prescrizione Farmaceutica">
    <qualifier name="TP"><value code="ST"/></qualifier>
  </code>
  <recordTarget><patientRole>
    <id root="2.16.840.1.113883.2.9.4.3.2" extension="RSSMRA65E20H501Z"/>
    <patient><name><family>Rossi</family><given>Mario</given></name></patient>
  </patientRole></recordTarget>
  <author><assignedAuthor>
    <assignedPerson><name><family>Bianchi</family><given>Luigi</given></name></assignedPerson>
  </assignedAuthor></author>
  <componentOf><encompassingEncounter><location><healthCareFacility>
    <serviceProviderOrganization><name>ONCOLOGIA</name></serviceProviderOrganization>
  </healthCareFacility></location></encompassingEncounter></componentOf>
  <component><structuredBody><component>
    <section>
      <code code="57828-6" codeSystem="2.16.840.1.113883.6.1"/>
      <entry><substanceAdministration classCode="SBADM" moodCode="RQO">
        <priorityCode code="S"/>
        <effectiveTime xsi:type="PIVL_TS"><period value="1" unit="d"/></effectiveTime>
        <routeCode code="IV" displayName="Intravenosa"/>
        <doseQuantity value="75" unit="mg"/>
        <consumable><manufacturedProduct><manufacturedLabeledDrug>
          <code code="035378055" codeSystem="2.16.840.1.113883.2.9.6.1.5"
                displayName="Methotrexate">
            <translation code="L01BA01" codeSystem="2.16.840.1.113883.6.73"
                         displayName="Methotrexate"/>
          </code>
        </manufacturedLabeledDrug></manufacturedProduct></consumable>
        <entryRelationship typeCode="SUBJ">
          <act classCode="ACT" moodCode="EVN">
            <code code="48767-8" codeSystem="2.16.840.1.113883.6.1"/>
            <text>Methotrexate 75mg in NaCl 0.9% 250ml, velocità 100ml/h</text>
          </act>
        </entryRelationship>
      </substanceAdministration></entry>
    </section>
  </component></structuredBody></component>
</ClinicalDocument>'
```

### Aggiunta cappa
```bash
curl -X POST http://farmacia-server:3000/api/cappe \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cappa Chemioterapici",
    "description": "Isolatore per citotossici ad alto rischio",
    "type": "ISOLATORE",
    "maxQueueSize": 10,
    "specializations": ["CHEMIOTERAPICI"]
  }'
```

### Configurazione campi output JSON
```bash
# Abilita solo i campi essenziali per un sistema terzo
curl -X PUT http://farmacia-server:3000/api/config/output-fields \
  -H "Content-Type: application/json" \
  -d '{
    "enabledFields": [
      "prescriptionId", "status", "priority",
      "assignedCappa.id", "assignedCappa.name", "assignedCappa.queueLength",
      "patient.id", "patient.name", "patient.ward",
      "preparation.drug", "preparation.dosage", "preparation.route",
      "timestamps.received", "timestamps.dispatched"
    ]
  }'

# Ripristina tutti i campi (nessun filtro)
curl -X PUT http://farmacia-server:3000/api/config/output-fields \
  -H "Content-Type: application/json" \
  -d '{"enabledFields": null}'
```

### Configurazione filtro di routing
```bash
curl -X POST http://farmacia-server:3000/api/config/filters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chemioterapici su Cappa dedicata",
    "priority": 1,
    "enabled": true,
    "conditions": {"drugCategories": ["CHEMOTHERAPY"], "ward": null, "urgency": null},
    "targetCappaId": "CAPPA_XXXXXXXX",
    "fallbackToDefault": true
  }'
```

---

## 12. Roadmap Futura (v2.0)

| Feature | Priorità | Stato | Note |
|---------|----------|-------|------|
| Autenticazione JWT / API Key | Alta | Da fare | Per ambienti multi-reparto |
| ~~Persistenza code su database~~ | ~~Media~~ | **✅ v1.8** | MySQL 8 via TypeORM |
| ~~Persistenza prescrizioni su database~~ | ~~Media~~ | **✅ v1.8** | Tabella `prescriptions` con snapshot JSON + colonne indicizzate |
| ~~Schema DB strutturato (anagrafiche, entità, associazioni)~~ | ~~Media~~ | **✅ v1.8** | 16 tabelle in 5 sezioni |
| Notifiche real-time via WebSocket | Media | Da fare | Aggiornamento push alle cappe |
| Audit log clinico | Alta | Da fare | Tracciabilità normativa |
| Supporto HL7 FHIR R5 | Bassa | Da fare | Aggiornamento versione FHIR |
| Dashboard metriche (tempo medio preparazione) | Media | Da fare | Reportistica (dati ora disponibili su DB) |
| Integrazione LDAP/AD per autenticazione | Media | Da fare | SSO ospedaliero |
| Multi-tenant (più farmacie) | Bassa | Da fare | Scalabilità organizzativa |
| Completamento stato coda (IN_PROGRESS, COMPLETED) via API | Media | Da fare | Feedback dalle postazioni |
