# Product Requirements Document
# Servizio HL7 - Dispatcher Preparazioni IV in Farmacia Ospedaliera

**Versione**: 2.3
**Data**: 2026-03-10
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
| 1.7 | 2026-03-04 | `POST /api/prescriptions` restituisce solo `HTTP 201` senza body (ricezione pura da sistemi sorgente). Filtro campi output rimosso dal POST e applicato esclusivamente ai GET. Aggiunto query param `cappaId` per filtrare per cappa. Transizione `deliveryStatus` PENDING→SENT avviene dopo l'invio della risposta HTTP (via `res.on('finish')`) |
| 1.8 | 2026-03-05 | Persistenza completa su MySQL 8 via TypeORM (sostituisce `data/config.json` e le strutture in-memory). Aggiunto container `hl7_mysql` nel Docker Compose. Nuovo schema database strutturato in 5 sezioni. Tutte le tabelle hanno `id` INT AUTO_INCREMENT come chiave primaria; le chiavi naturali (`code`, `field_path`) promosse a UNIQUE. Aggiunto file `.env` per configurazione connessione DB in sviluppo locale. |
| 1.9 | 2026-03-05 | Ordinamento coda configurabile per cappa: nuovo attributo `queueSortOrder` (PRIORITY \| ARRIVAL_ASC \| ARRIVAL_DESC \| WARD). Nuova colonna `patient_ward` in `cappa_queue` per supporto sort per reparto. Dashboard: tabella prescrizioni mostra solo PENDING con paginazione a blocchi da 10 ("Carica altre"). UI cappe: select ordinamento nel form creazione e nel modal modifica. |
| 2.0 | 2026-03-07 | Rimozione del sistema cappe e del routing engine. Il servizio diventa un dispatcher puro: riceve, parsifica, normalizza e restituisce il JSON strutturato senza smistamento su postazioni fisiche. Rimossi: tabelle `cappe`, `cappa_specializations`, `cappa_queue`, `ana_cappa_*`; colonne `assigned_cappa_id`, `assigned_cappa`, `routing_info` da `prescriptions`; colonne `target_cappa_id`, `fallback_to_default` da `routing_filters`; colonna `default_routing_strategy` da `app_config`. Rimossa pagina Web UI `config.html`. `POST /api/prescriptions` ora restituisce `HTTP 201` con body JSON completo dei campi decodificati (filtro output applicato). Dashboard mostra solo prescrizioni `PENDING` non ancora consegnate via API. La pagina Drug Categories sostituisce Cappe nella navigazione. |
| 2.1 | 2026-03-09 | Sanitizzazione post-parsing: nuovo metodo `sanitize()` in `ParsersService` rimuove dati volume/solvente clinicamente impossibili per vie di somministrazione a siringa (SC, IM, SIRINGA) quando `volumeValue > 60 ml`. Fix HL7 v2: regex fallback volume da NTE aggiornata con negative lookahead `(?!\s*\/)` per non interpretare erroneamente le velocità di infusione (es. `100 ml/h`) come volume; regex `isPharmUnit` corretta (`fial[ae]` per riconoscere sia "fiale" che "fiala"). Fix FHIR XML: `doseQuantity` ora letto sia dalla struttura R4 standard (dentro `<doseAndRate>`) sia da implementazioni non conformi con `<doseQuantity>` direttamente su `<dosageInstruction>`; supporto `doseAndRate` come array. Fix CDA-PrF: qualifier TP per priorità cercato sia direttamente su `cd.code.qualifier` (struttura standard) sia in `cd.code.translation[].qualifier` (struttura alternativa), entrambe ora supportate. |
| 2.2 | 2026-03-10 | Rimozione completa del modulo Categorie Farmaco: eliminate pagina Web UI `/drug-categories.html`, controller/service/module `drug-categories`, entità `DrugCategoryEntity`, `DrugCategoryAliasEntity`, `DrugCategoryAtcEntity`, `AtcLevel1Entity`, `AtcLevel2Entity` e relative tabelle DB (`drug_categories`, `drug_category_aliases`, `drug_category_atc`, `atc_level1`, `atc_level2`). La categorizzazione farmaci rimane tramite `drug-category.util.ts` (regex su nome + prefisso ATC statico). |
| 2.3 | 2026-03-10 | Aggiunta tabella `incoming_messages` per logging di ogni payload ricevuto (raw, formato rilevato, IP sorgente, esito parse SUCCESS/ERROR). Normalizzazione tabella `prescriptions`: rimossa colonna JSON `preparation`, aggiunte 9 colonne atomiche (`prep_code`, `prep_dosage_value`, `prep_dosage_unit`, `prep_solvent`, `prep_volume`, `prep_volume_value`, `prep_volume_unit`, `prep_infusion_rate`, `prep_final_concentration`). Anagrafica campi output da DB: nuove tabelle `ana_output_fields` (catalogo 29 campi + metadati gruppo/obbligatorio) e `app_config_output_fields` (campi abilitati, relazionale con FK). Pagina `/output.html` ridisegnata come anagrafica tabellare divisa per sezione con anteprima JSON live. Fix parser HL7 v2: prescrittore letto da `PV1.7` come fallback a `ORC.12`. Fix categoria farmaco: ripristinato `inferCategory()` su tutti i parser (HL7v2, FHIR JSON, FHIR XML, CDA-PrF) — `prep_category` ora correttamente distinto da `prep_code`. |

---

## 1. Obiettivo del Prodotto

Sviluppare un servizio software on-premise che funga da intermediario tra i sistemi informativi ospedalieri (cartelle cliniche, sistemi di prescrizione) e i software delle postazioni di preparazione farmaci in farmacia ospedaliera.

Il servizio riceve prescrizioni di farmaci in formato standard sanitario (HL7 v2, FHIR R4, CDA-PrF), le normalizza in una struttura unificata, le categorizza automaticamente e le espone via API REST in formato JSON strutturato, pronto per il consumo da parte di sistemi terzi.

---

## 2. Contesto e Problema

Le farmacie ospedaliere ricevono prescrizioni da reparti diversi attraverso sistemi informativi eterogenei che parlano protocolli differenti (HL7 v2, FHIR). Le prescrizioni di farmaci per via endovenosa (preparazioni IV) richiedono una lavorazione manuale da parte di farmacisti specializzati.

**Problemi risolti:**
- Sistemi sorgente parlano protocolli diversi e non compatibili tra loro
- Difficoltà nel gestire le priorità (urgenze STAT vs routine)
- Assenza di un formato dati unificato leggibile dai software di postazione
- Nessuna visibilità sulle prescrizioni in attesa di lavorazione

---

## 3. Utenti Target

| Ruolo | Utilizzo |
|-------|----------|
| Farmacista responsabile | Configura i filtri e i campi output via Web UI |
| Farmacista preparatore | Il software di postazione legge le prescrizioni via API GET |
| Tecnico informatico | Integra il servizio con i sistemi ospedalieri via API POST |
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

Indipendentemente dal formato sorgente, tutti i dati vengono convertiti nella struttura interna unificata `NormalizedPrescription`. Dopo il parsing, `ParsersService` applica un passo di **sanitizzazione** che rimuove dati clinicamente impossibili:

- **Syringe sanitizer**: se la via di somministrazione è `SC`, `IM` o contiene `SIRINGA` e il volume parsificato supera **60 ml**, i campi `volume`, `volumeValue`, `volumeUnit`, `solvent`, `infusionRate` e `finalConcentration` vengono azzerati (un volume così elevato è quasi certamente un errore di copia dal messaggio sorgente).

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

Il sistema classifica i farmaci per nome mediante pattern regex:

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

La categorizzazione è interamente statica: il modulo `drug-category.util.ts` applica prima le regex sul nome del farmaco, poi i prefissi ATC sul codice. Non richiede tabelle DB né configurazione a runtime.

### 4.4 Filtri di Configurazione

I filtri sono regole memorizzate sul database che possono essere usate per classificare o pre-elaborare le prescrizioni in ingresso. Ogni filtro ha:
- `priority`: numero intero (1 = massima priorità)
- `enabled`: abilitato/disabilitato
- `conditions`: criteri di corrispondenza (AND logico)
  - `drugCategories`: lista categorie farmaco (null = qualsiasi)
  - `ward`: reparto richiedente, match parziale case-insensitive (null = qualsiasi)
  - `urgency`: STAT o URGENT (null = qualsiasi)

I filtri sono gestibili tramite la pagina **Filtri** della Web UI e gli endpoint `/api/config/filters`.

### 4.5 Dispatcher

Il `DispatcherService` riceve la `NormalizedPrescription` e assembla il `DispatchResult` — la struttura JSON finale che viene persistita su DB e restituita via API. Non esegue smistamento su postazioni fisiche.

**Struttura DispatchResult:**
```
DispatchResult {
  prescriptionId: UUID
  status: 'DISPATCHED'
  deliveryStatus: 'PENDING' | 'SENT'
  priority: string
  sourceFormat: string
  prescribedBy?: string
  notes?: string
  patient: { id, name, ward, bedNumber? }
  preparation: {
    drug, category, code?, dosage, dosageValue?, dosageUnit?,
    route, solvent?, volume?, volumeValue?, volumeUnit?,
    infusionRate?, finalConcentration?, frequency
  }
  timestamps: { received, dispatched, sentToApi?, requiredBy? }
}
```

### 4.6 Output

#### 4.6.1 Risposta POST /api/prescriptions

Il `POST` è utilizzato dai sistemi sorgente (HIS, EHR, cartelle cliniche) per inviare prescrizioni al servizio. La risposta contiene il `DispatchResult` con il filtro output applicato:

| Scenario | HTTP | Body |
|----------|------|------|
| Prescrizione ricevuta e salvata | `201 Created` | JSON con campi decodificati (filtro output applicato) |
| Body mancante o non leggibile | `400 Bad Request` | `{"error": "..."}` |
| Formato non riconosciuto | `400 Bad Request` | `{"error": "..."}` |
| Errore interno | `500 Internal Server Error` | `{"error": "..."}` |

La prescrizione è creata con `deliveryStatus: PENDING` e rimane tale fino alla prima lettura via `GET` (senza `raw=true`).

#### 4.6.2 Risposta GET /api/prescriptions

I `GET` sono utilizzati dai software delle postazioni per leggere le preparazioni in attesa. La risposta è un array JSON con i soli campi configurati nella pagina **Campi Output**.

**Comportamento `deliveryStatus`:**
- Al momento del `POST`: la prescrizione entra in stato `PENDING`
- Quando un `GET` senza `raw=true` viene chiamato: la risposta riporta `deliveryStatus: PENDING`; solo dopo l'invio della risposta HTTP il campo viene aggiornato a `SENT` e `timestamps.sentToApi` viene valorizzato
- `GET` con `raw=true`: restituisce i dati senza applicare il filtro output e senza marcare SENT (usato internamente dalla dashboard)

**Struttura JSON completa (con tutti i campi selezionabili):**

```json
{
  "prescriptionId": "uuid-v4",
  "status": "DISPATCHED",
  "deliveryStatus": "SENT",
  "priority": "STAT",
  "sourceFormat": "HL7V2",
  "prescribedBy": "Bianchi Luigi",
  "notes": "Methotrexate 75mg in NaCl 0.9% 250ml",
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
Tramite la pagina Web UI "Campi Output" (o l'API `PUT /api/config/output-fields`) è possibile selezionare i campi da includere nella risposta dei `GET /api/prescriptions`. Il filtro è applicato anche al `POST`. I campi sono identificati tramite dot-notation:

| Gruppo | Campi |
|--------|-------|
| Generale | `prescriptionId`*, `status`*, `priority`, `sourceFormat`, `prescribedBy`, `notes`, `deliveryStatus` |
| Paziente | `patient.id`, `patient.name`, `patient.ward`, `patient.bedNumber` |
| Preparazione Farmaco | `preparation.drug`, `preparation.category`, `preparation.code`, `preparation.dosage`, `preparation.dosageValue`, `preparation.dosageUnit`, `preparation.route`, `preparation.solvent`, `preparation.volume`, `preparation.volumeValue`, `preparation.volumeUnit`, `preparation.infusionRate`, `preparation.finalConcentration`, `preparation.frequency` |
| Timestamp | `timestamps.received`, `timestamps.dispatched`, `timestamps.sentToApi`, `timestamps.requiredBy` |

\* Campo obbligatorio (sempre incluso, non disattivabile)

### 4.7 Interfaccia di Configurazione

#### 4.7.1 Web UI
Pannello amministrativo browser-based accessibile via HTTP, composto da 3 pagine:

| Pagina | URL | Funzionalità |
|--------|-----|--------------|
| Dashboard | `/` | Prescrizioni **PENDING** in attesa con paginazione da 10 ("Carica altre"), form di test con generatore casuale per tutti i formati |
| Filtri | `/filtri.html` | CRUD filtri di configurazione, impostazione condizioni e priorità |
| Campi Output | `/output.html` | Anagrafica tabellare di tutti i 29 campi configurabili, divisi per sezione (Generale, Paziente, Preparazione Farmaco, Timestamp). Selezione checkbox per abilitare/disabilitare ogni campo. Anteprima JSON live aggiornata in tempo reale. Il catalogo e i campi abilitati sono letti/scritti via DB. |

La dashboard si aggiorna automaticamente ogni 10 secondi.

**Tabella prescrizioni in attesa (dashboard):**
- Mostra solo prescrizioni con `deliveryStatus = PENDING` (non ancora consegnate via API), fetched con `?status=PENDING&raw=true` (non marca SENT)
- Paginazione: 10 righe per blocco, pulsante "Carica altre N" per caricare il blocco successivo
- Colonne: ID | Priorità | Paziente | Reparto | Farmaco | Dosaggio | Contenitore Finale | Ricevuta

Il campo "Contenitore Finale" mostra: solvente + volume + concentrazione finale calcolata (in grigio).

**Generatore prescrizioni di test:**
La sezione test nella dashboard include un pulsante "Genera Casuale" che produce ad ogni click un payload valido e diverso per il formato selezionato (HL7 v2 / FHIR JSON / FHIR XML / CDA-PrF), randomizzando paziente, farmaco, dosaggio, reparto, priorità, solvente, volume e velocità di infusione.

I messaggi HL7 v2 generati usano il segmento RXE (Pharmacy Encoded Order) con segmenti RXC per la composizione IV, conformi allo standard HL7 v2.5.

I documenti CDA-PrF generati seguono il template POCD_MT000040 con sezione LOINC 57828-6, codici ATC/AIC, nota infusionale LOINC 48767-8 e priorità via `priorityCode` e qualifier TP.

#### 4.7.2 REST API

```
# Prescrizioni
POST   /api/prescriptions                   Riceve prescrizione (HL7v2/FHIR/CDA) → HTTP 201 + JSON body (filtro output applicato)
GET    /api/prescriptions                   Lista prescrizioni (filtro output applicato) → marca SENT
GET    /api/prescriptions?status=PENDING    Solo prescrizioni non ancora lette → marca SENT
GET    /api/prescriptions?status=SENT       Solo prescrizioni già consegnate
GET    /api/prescriptions?raw=true          Tutti i campi, nessun filtro, NON marca SENT
GET    /api/prescriptions?status=PENDING&raw=true  PENDING senza marcare SENT (usato dalla dashboard)
GET    /api/prescriptions/:id               Dettaglio singola prescrizione → marca SENT
PATCH  /api/prescriptions/:id/sent          Marca manualmente come SENT

# Filtri di configurazione
GET    /api/config/filters         Lista filtri ordinati per priorità
POST   /api/config/filters         Aggiunge filtro
PUT    /api/config/filters/:id     Modifica filtro
DELETE /api/config/filters/:id     Elimina filtro

# Configurazione campi output
GET    /api/config/output-fields   Restituisce lista campi abilitati (null = tutti)
PUT    /api/config/output-fields   Imposta campi abilitati { "enabledFields": ["prescriptionId", ...] | null }
```

**Note endpoint output-fields:**
- `enabledFields: null` → tutti i campi inclusi (nessun filtro)
- `enabledFields: []` → array vuoto equivale a null (nessun filtro)
- I campi obbligatori (`prescriptionId`, `status`) sono sempre inclusi indipendentemente dalla configurazione

### 4.8 Persistenza

Tutta la persistenza è affidata a un database **MySQL 8** gestito via **TypeORM** (con `synchronize: false`). Tabelle utilizzate:

| Dato | Tabella |
|------|---------|
| Filtri di configurazione | `routing_filters` |
| Catalogo campi output | `ana_output_fields` |
| Campi output abilitati | `app_config_output_fields` |
| Configurazione generale | `app_config` |
| Prescrizioni ricevute | `prescriptions` |
| Log payload in ingresso | `incoming_messages` |

Per lo schema completo, il DDL di installazione, i dati seed e le migrazioni vedere **`DatabaseHL7.MD`**.

**Flusso di avvio (`onModuleInit`):**
1. `ConfigService` legge da DB filtri e `app_config` e popola la cache in-memory
2. Da questo momento tutte le letture sincrone usano la cache; tutte le scritture vanno sia in cache che su DB

**Storico prescrizioni:** il `findAll` restituisce fino a 200 elementi per risposta; il DB non ha limiti.

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
- Nessun limite di throughput definito (traffico tipico farmacia: decine di prescrizioni/ora)

### 5.3 Sicurezza
- Il servizio opera su rete interna ospedaliera (non esposto su internet)
- Accesso consigliato tramite SSH tunnel per manutenzione remota
- CORS abilitato (configurabile per restringere origini)
- Nessuna autenticazione nella v2.0
- Le credenziali DB sono configurate tramite variabili d'ambiente (file `.env` in sviluppo, env Docker in produzione)

### 5.4 Disponibilità
- Riavvio automatico tramite Docker (`restart: unless-stopped`)
- Un riavvio del servizio non perde né la configurazione né le prescrizioni storiche (persistenza su DB)

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
| Database | MySQL 8.0 | 8.0 |
| ORM | TypeORM | 0.3.x |
| Driver DB | mysql2 | 3.x |
| Env config | dotenv | — |
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
│                      │      DISPATCHER          │            │
│                      │  Assembla DispatchResult │            │
│                      │  deliveryStatus: PENDING │            │
│                      └──────────┬──────────────┘            │
│                                 │ TypeORM (mysql2)           │
│  ┌──────────────────────────────┴──────────────────────────┐ │
│  │  CONFIG CACHE (in-memory) — caricata dal DB al boot     │ │
│  │  Filtri │ Output fields                                  │ │
│  └──────────────────────────────────────────────────────── ┘ │
└───────────────────────────┬─────────────────────────────────┘
                            │ TypeORM (R/W)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  MySQL 8 (hl7_mysql)                         │
│                                                              │
│  ENTITÀ               CONFIGURAZIONE        LOG INGRESSO      │
│  prescriptions        app_config            incoming_messages │
│                       routing_filters                        │
│                       ana_output_fields                      │
│                       app_config_output_fields               │
└─────────────────────────────────────────────────────────────┘
                       │ JSON output
                       ▼
            API Consumer / Software Postazione
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
│   │       ├── routing-filter.entity.ts     Entità tabella `routing_filters`
│   │       ├── app-config.entity.ts         Entità tabella `app_config`
│   │       ├── prescription.entity.ts       Entità tabella `prescriptions` (colonne atomiche prep_*)
│   │       ├── incoming-message.entity.ts   Entità tabella `incoming_messages`
│   │       ├── ana-output-field.entity.ts   Entità tabella `ana_output_fields` (catalogo)
│   │       └── app-config-output-field.entity.ts  Entità tabella `app_config_output_fields`
│   ├── parsers/
│   │   ├── parsers.module.ts
│   │   ├── parsers.service.ts               Auto-detect + orchestrazione + sanitize()
│   │   ├── hl7v2.parser.ts                  Parser HL7 v2 (RXO/RXE, RXC, conv. italiana)
│   │   ├── fhir-json.parser.ts              Parser FHIR MedicationRequest JSON
│   │   ├── fhir-xml.parser.ts               Parser FHIR XML (via fast-xml-parser)
│   │   ├── cda-prf.parser.ts                Parser CDA-PrF HL7 Italia v2.3
│   │   └── drug-category.util.ts            Inferenza categoria farmaco (regex nome + ATC)
│   ├── prescriptions/
│   │   ├── prescriptions.module.ts
│   │   ├── prescriptions.controller.ts      POST + GET /api/prescriptions
│   │   └── prescriptions.service.ts         Scrittura/lettura su DB (max 200 per GET)
│   ├── dispatcher/
│   │   ├── dispatcher.module.ts
│   │   └── dispatcher.service.ts            Assembla DispatchResult da NormalizedPrescription
│   └── config/
│       ├── config.module.ts
│       ├── config.controller.ts             /api/config/filters, /api/config/output-fields
│       └── config.service.ts               Lettura DB al boot, cache in-memory, filtro output
├── frontend/
│   ├── index.html                           Dashboard (prescrizioni PENDING + generatore test)
│   ├── filtri.html                          Gestione filtri di configurazione
│   ├── output.html                          Anagrafica campi output JSON (tabella per sezione)
│   └── assets/
│       ├── style.css
│       └── app.js                           Logic UI + generatore prescrizioni random
├── migrations/
│   ├── v2.0_remove_cappe.sql                Rimozione tabelle cappe e colonne correlate
│   ├── v2.1_remove_drug_classification.sql  Rimozione classificazione farmaci da DB e parser
│   └── v2.2_remove_cappa_output_fields.sql  Pulizia output fields e colonne obsolete cappe
├── .env                                     Variabili connessione DB per sviluppo locale (non in git)
├── HL7Service.MD                            Questo documento (servizio, API, parser)
├── DatabaseHL7.MD                           Schema DB, DDL completo, seed, migrazioni
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

---

## 9. Schema Database

Schema completo, DDL di installazione, dati seed e migrazioni sono documentati in **`DatabaseHL7.MD`**.

Il database `hl7service` (MySQL 8) è gestito con `synchronize: false` in TypeORM; le modifiche DDL si applicano manualmente.

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

# Risposta: HTTP 201 Created + JSON body con i campi decodificati
```

### Lettura prescrizioni PENDING (sistema di postazione)
```bash
# Il software di postazione legge le prescrizioni in attesa
curl http://farmacia-server:3000/api/prescriptions?status=PENDING

# La risposta riporta deliveryStatus=PENDING; dopo l'invio HTTP viene aggiornato a SENT
# La chiamata successiva con status=PENDING restituirà solo le nuove prescrizioni
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
            <translation code="L01BA01" codeSystem="2.16.840.1.113883.6.73"/>
          </code>
        </manufacturedLabeledDrug></manufacturedProduct></consumable>
        <entryRelationship typeCode="SUBJ">
          <act classCode="ACT" moodCode="EVN">
            <code code="48767-8" codeSystem="2.16.840.1.113883.6.1"/>
            <text>NaCl 0.9% 250ml velocita 100ml/h</text>
          </act>
        </entryRelationship>
      </substanceAdministration></entry>
    </section>
  </component></structuredBody></component>
</ClinicalDocument>'
```
