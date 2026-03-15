# Database Reference
# Servizio HL7 - Dispatcher Preparazioni IV in Farmacia Ospedaliera

**Versione schema**: 2.3
**Data**: 2026-03-10
**Database**: MySQL 8.0
**Charset**: utf8mb4 / utf8mb4_unicode_ci

---

## 1. Connessione

### Sviluppo locale (Docker)

| Parametro | Valore |
|-----------|--------|
| Host | `localhost` |
| Porta | `3307` (mappa al 3306 interno del container) |
| Database | `hl7service` |
| Utente | `hl7user` |
| Password | `hl7password` |
| Root password | `rootpassword` |
| Container | `hl7_mysql` |

```bash
# Connessione da riga di comando
mysql -h 127.0.0.1 -P 3307 -u hl7user -phl7password hl7service --default-character-set=utf8mb4

# Tramite docker exec
docker exec -it hl7_mysql mysql -uhl7user -phl7password --default-character-set=utf8mb4 hl7service
```

### Produzione (Docker interno)

Il container `hl7_service` si connette a `hl7_mysql` tramite hostname `mysql` nella rete Docker interna (porta 3306). Le credenziali sono passate via variabili d'ambiente nel `docker-compose.yml`.

### Configurazione `.env` (sviluppo locale)

```
DB_HOST=localhost
DB_PORT=3307
DB_NAME=hl7service
DB_USER=hl7user
DB_PASSWORD=hl7password
```

---

## 2. Schema — Installazione da zero

Eseguire nell'ordine indicato (rispettare le dipendenze FK).

```sql
-- Imposta charset di default per la sessione
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ============================================================
-- TABELLA: prescriptions
-- Prescrizioni ricevute con tutti i campi decodificati atomici
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id                      VARCHAR(36)   NOT NULL,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'DISPATCHED',
  delivery_status         ENUM('PENDING','SENT') NOT NULL DEFAULT 'PENDING',
  priority                ENUM('STAT','URGENT','ROUTINE') NOT NULL,
  source_format           ENUM('HL7V2','FHIR_JSON','FHIR_XML','CDA_PRF') NOT NULL,
  prescribed_by           VARCHAR(200)  NULL,
  notes                   TEXT          NULL,

  -- Paziente
  patient_id              VARCHAR(100)  NOT NULL,
  patient_name            VARCHAR(200)  NOT NULL,
  patient_ward            VARCHAR(100)  NOT NULL,
  patient_bed_number      VARCHAR(20)   NULL,

  -- Preparazione farmaco (tutti i campi atomici)
  prep_drug               VARCHAR(200)  NOT NULL,
  prep_category           VARCHAR(100)  NOT NULL,
  prep_code               VARCHAR(50)   NULL,
  prep_dosage             VARCHAR(50)   NOT NULL,
  prep_dosage_value       DECIMAL(10,3) NULL,
  prep_dosage_unit        VARCHAR(30)   NULL,
  prep_route              VARCHAR(50)   NOT NULL,
  prep_solvent            VARCHAR(100)  NULL,
  prep_volume             VARCHAR(30)   NULL,
  prep_volume_value       DECIMAL(10,3) NULL,
  prep_volume_unit        VARCHAR(20)   NULL,
  prep_infusion_rate      VARCHAR(50)   NULL,
  prep_final_concentration VARCHAR(50)  NULL,
  prep_frequency          VARCHAR(100)  NOT NULL,

  -- Timestamp
  ts_received             DATETIME      NOT NULL,
  ts_dispatched           DATETIME      NOT NULL,
  ts_required_by          DATETIME      NULL,
  ts_sent_to_api          DATETIME      NULL,
  created_at              DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_delivery_status (delivery_status),
  INDEX idx_priority (priority),
  INDEX idx_ts_received (ts_received)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELLA: incoming_messages
-- Log grezzo di ogni payload ricevuto via POST /api/prescriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS incoming_messages (
  id               VARCHAR(36)  NOT NULL,
  raw_payload      MEDIUMTEXT   NOT NULL,
  detected_format  ENUM('HL7V2','FHIR_JSON','FHIR_XML','CDA_PRF','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  source_ip        VARCHAR(45)  NULL,
  parse_status     ENUM('SUCCESS','ERROR') NOT NULL DEFAULT 'SUCCESS',
  error_message    TEXT         NULL,
  prescription_id  VARCHAR(36)  NULL,
  received_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_parse_status (parse_status),
  INDEX idx_received_at (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELLA: app_config
-- Configurazione generale del servizio (singleton, id = 1)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_config (
  id            INT   NOT NULL DEFAULT 1,
  output_fields JSON  NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELLA: routing_filters
-- Filtri per classificazione/prioritizzazione prescrizioni
-- ============================================================
CREATE TABLE IF NOT EXISTS routing_filters (
  id                  VARCHAR(36)  NOT NULL,
  name                VARCHAR(100) NOT NULL,
  enabled             TINYINT(1)   NOT NULL DEFAULT 1,
  priority            INT          NOT NULL DEFAULT 0,
  condition_drug_cats JSON         NULL,
  condition_ward      VARCHAR(100) NULL,
  condition_urgency   ENUM('STAT','URGENT') NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_enabled_priority (enabled, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELLA: ana_output_fields
-- Catalogo di tutti i campi configurabili in output (read-only a runtime)
-- Deve essere popolata con i dati seed (sezione 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS ana_output_fields (
  id          INT          NOT NULL AUTO_INCREMENT,
  field_path  VARCHAR(100) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  group_name  VARCHAR(50)  NOT NULL DEFAULT 'Generale',
  description VARCHAR(255) NULL,
  required    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  UNIQUE KEY uk_field_path (field_path),
  INDEX idx_group_sort (group_name, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABELLA: app_config_output_fields
-- Campi output abilitati dall'amministratore.
-- Vuota = tutti i campi inclusi (nessun filtro).
-- ============================================================
CREATE TABLE IF NOT EXISTS app_config_output_fields (
  id          INT          NOT NULL AUTO_INCREMENT,
  field_path  VARCHAR(100) NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,

  PRIMARY KEY (id),
  UNIQUE KEY uk_field_path (field_path),
  CONSTRAINT fk_acof_field_path
    FOREIGN KEY (field_path) REFERENCES ana_output_fields (field_path)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Dati iniziali (seed)

Da eseguire dopo la creazione delle tabelle.

```sql
SET NAMES utf8mb4;

-- Configurazione singleton
INSERT IGNORE INTO app_config (id, output_fields) VALUES (1, NULL);

-- Catalogo campi output (29 campi)
INSERT INTO ana_output_fields (field_path, label, group_name, description, required, sort_order) VALUES
  -- Generale
  ('prescriptionId',   'ID Prescrizione',     'Generale',            'Identificatore UUID generato dal servizio',                       1,  1),
  ('status',           'Stato dispatch',       'Generale',            'Sempre DISPATCHED se elaborazione riuscita',                      0,  2),
  ('priority',         'Priorita''',           'Generale',            'Livello urgenza: STAT | URGENT | ROUTINE',                        0,  3),
  ('sourceFormat',     'Formato sorgente',     'Generale',            'Protocollo in ingresso: HL7V2, FHIR_JSON, FHIR_XML, CDA_PRF',     0,  4),
  ('prescribedBy',     'Medico prescrittore',  'Generale',            'Nome del medico che ha emesso la prescrizione',                   0,  5),
  ('notes',            'Note cliniche',        'Generale',            'Note o istruzioni aggiuntive allegate alla prescrizione',         0,  6),
  ('deliveryStatus',   'Stato consegna API',   'Generale',            'SENT = risposta HTTP restituita; PENDING = non ancora consegnata',0,  7),
  -- Paziente
  ('patient.id',       'ID paziente',          'Paziente',            'Identificatore paziente dal sistema sorgente',                    0, 10),
  ('patient.name',     'Nome paziente',        'Paziente',            'Nome e cognome del paziente',                                    0, 11),
  ('patient.ward',     'Reparto',              'Paziente',            'Reparto di ricovero o reparto richiedente',                       0, 12),
  ('patient.bedNumber','Numero letto',         'Paziente',            'Numero letto o stanza del paziente',                             0, 13),
  -- Preparazione Farmaco
  ('preparation.drug',               'Nome farmaco',           'Preparazione Farmaco', 'Denominazione commerciale o generica del farmaco',           0, 20),
  ('preparation.category',           'Categoria',              'Preparazione Farmaco', 'Categoria terapeutica (CHEMOTHERAPY, ANTIBIOTIC, ecc.)',     0, 21),
  ('preparation.code',               'Codice ATC/AIC',         'Preparazione Farmaco', 'Codice identificativo del farmaco (es. L01BA01)',            0, 22),
  ('preparation.dosage',             'Dosaggio',               'Preparazione Farmaco', 'Dosaggio formattato (es. 75 mg)',                            0, 23),
  ('preparation.dosageValue',        'Valore dosaggio',        'Preparazione Farmaco', 'Valore numerico del dosaggio',                               0, 24),
  ('preparation.dosageUnit',         'Unita'' dosaggio',       'Preparazione Farmaco', 'Unita'' di misura del dosaggio (es. mg, UI)',                0, 25),
  ('preparation.route',              'Via di somministrazione','Preparazione Farmaco', 'IV, IM, PO, SC, ecc.',                                       0, 26),
  ('preparation.solvent',            'Solvente/diluente',      'Preparazione Farmaco', 'Solvente (es. NaCl 0.9%, Glucosio 5%)',                      0, 27),
  ('preparation.volume',             'Volume',                 'Preparazione Farmaco', 'Volume contenitore finale formattato (es. 250 ml)',           0, 28),
  ('preparation.volumeValue',        'Valore volume',          'Preparazione Farmaco', 'Valore numerico del volume',                                  0, 29),
  ('preparation.volumeUnit',         'Unita'' volume',         'Preparazione Farmaco', 'Unita'' del volume (es. ml)',                                0, 30),
  ('preparation.infusionRate',       'Velocita'' infusione',   'Preparazione Farmaco', 'Velocita'' di infusione (es. 100 ml/h)',                     0, 31),
  ('preparation.finalConcentration', 'Concentrazione finale',  'Preparazione Farmaco', 'Concentrazione calcolata: dosaggio/volume (es. 0.3 mg/ml)',  0, 32),
  ('preparation.frequency',          'Frequenza',              'Preparazione Farmaco', 'Frequenza di somministrazione (es. QD, BID, Once)',           0, 33),
  -- Timestamp
  ('timestamps.received',    'Data ricezione',        'Timestamp', 'Data/ora di ricezione della prescrizione (ISO 8601)',          0, 40),
  ('timestamps.dispatched',  'Data dispatch',         'Timestamp', 'Data/ora di elaborazione della prescrizione (ISO 8601)',       0, 41),
  ('timestamps.requiredBy',  'Data richiesta entro',  'Timestamp', 'Data/ora entro cui la preparazione e'' necessaria',           0, 42),
  ('timestamps.sentToApi',   'Data invio API',        'Timestamp', 'Data/ora di consegna della risposta al sistema terzo',        0, 43)
ON DUPLICATE KEY UPDATE
  label       = VALUES(label),
  group_name  = VALUES(group_name),
  description = VALUES(description),
  required    = VALUES(required),
  sort_order  = VALUES(sort_order);
```

---

## 4. Schema — Riepilogo tabelle

| Tabella | PK | Righe attese | Scopo |
|---------|----|-------------|-------|
| `prescriptions` | `id` VARCHAR(36) UUID | Crescente (storico) | Prescrizioni ricevute e decodificate |
| `incoming_messages` | `id` VARCHAR(36) UUID | Crescente (log) | Payload grezzi in ingresso con esito parse |
| `app_config` | `id` INT (singleton=1) | 1 | Configurazione generale |
| `routing_filters` | `id` VARCHAR(36) UUID | Decine | Filtri di classificazione prescrizioni |
| `ana_output_fields` | `id` INT AUTO_INCREMENT | 29 (fisso) | Catalogo campi configurabili (seed) |
| `app_config_output_fields` | `id` INT AUTO_INCREMENT | 0–29 | Campi output abilitati (FK → ana_output_fields) |

---

## 5. Descrizione colonne per tabella

### 5.1 `prescriptions`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | VARCHAR(36) | UUID v4 generato dal servizio |
| `status` | VARCHAR(20) | Sempre `DISPATCHED` se parsing riuscito |
| `delivery_status` | ENUM(PENDING,SENT) | PENDING = non ancora letto via GET; SENT = risposta HTTP inviata |
| `priority` | ENUM(STAT,URGENT,ROUTINE) | Livello urgenza |
| `source_format` | ENUM(HL7V2,FHIR_JSON,FHIR_XML,CDA_PRF) | Formato messaggio sorgente |
| `prescribed_by` | VARCHAR(200) | Nome medico prescrittore (nullable) |
| `notes` | TEXT | Note cliniche (nullable) |
| `patient_id` | VARCHAR(100) | ID paziente dal sistema sorgente |
| `patient_name` | VARCHAR(200) | Nome e cognome paziente |
| `patient_ward` | VARCHAR(100) | Reparto |
| `patient_bed_number` | VARCHAR(20) | Numero letto (nullable) |
| `prep_drug` | VARCHAR(200) | Nome farmaco |
| `prep_category` | VARCHAR(100) | Categoria terapeutica (CHEMOTHERAPY, ANTIBIOTIC, …) |
| `prep_code` | VARCHAR(50) | Codice ATC o AIC (nullable) |
| `prep_dosage` | VARCHAR(50) | Dosaggio formattato (es. "75 mg") |
| `prep_dosage_value` | DECIMAL(10,3) | Valore numerico dosaggio (nullable) |
| `prep_dosage_unit` | VARCHAR(30) | Unita' dosaggio (es. "mg") (nullable) |
| `prep_route` | VARCHAR(50) | Via di somministrazione (IV, IM, PO, SC, …) |
| `prep_solvent` | VARCHAR(100) | Solvente/diluente (nullable) |
| `prep_volume` | VARCHAR(30) | Volume formattato (es. "250 ml") (nullable) |
| `prep_volume_value` | DECIMAL(10,3) | Valore numerico volume (nullable) |
| `prep_volume_unit` | VARCHAR(20) | Unita' volume (es. "ml") (nullable) |
| `prep_infusion_rate` | VARCHAR(50) | Velocita' infusione (es. "100 ml/h") (nullable) |
| `prep_final_concentration` | VARCHAR(50) | Concentrazione calcolata (es. "0.3 mg/ml") (nullable) |
| `prep_frequency` | VARCHAR(100) | Frequenza somministrazione |
| `ts_received` | DATETIME | Timestamp ricezione prescrizione |
| `ts_dispatched` | DATETIME | Timestamp elaborazione dispatcher |
| `ts_required_by` | DATETIME | Scadenza richiesta (nullable) |
| `ts_sent_to_api` | DATETIME | Timestamp invio risposta HTTP (nullable) |
| `created_at` | DATETIME | Timestamp inserimento record |

### 5.2 `incoming_messages`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | VARCHAR(36) | UUID v4 generato dal servizio |
| `raw_payload` | MEDIUMTEXT | Payload grezzo ricevuto (fino a 16 MB) |
| `detected_format` | ENUM(HL7V2,FHIR_JSON,FHIR_XML,CDA_PRF,UNKNOWN) | Formato rilevato prima del parsing |
| `source_ip` | VARCHAR(45) | IP del client mittente (nullable) |
| `parse_status` | ENUM(SUCCESS,ERROR) | Esito del parsing |
| `error_message` | TEXT | Messaggio di errore se parse_status=ERROR (nullable) |
| `prescription_id` | VARCHAR(36) | FK logica verso prescriptions.id (nullable) |
| `received_at` | DATETIME | Timestamp ricezione (AUTO su INSERT) |

### 5.3 `routing_filters`

| Colonna | Tipo | Note |
|---------|------|------|
| `id` | VARCHAR(36) | UUID v4 |
| `name` | VARCHAR(100) | Nome descrittivo del filtro |
| `enabled` | TINYINT(1) | 1 = attivo, 0 = disabilitato |
| `priority` | INT | Ordine applicazione (1 = massima priorita') |
| `condition_drug_cats` | JSON | Array categorie farmaco (null = qualsiasi) |
| `condition_ward` | VARCHAR(100) | Reparto target, match parziale case-insensitive (null = qualsiasi) |
| `condition_urgency` | ENUM(STAT,URGENT) | Livello urgenza (null = qualsiasi) |
| `created_at` / `updated_at` | DATETIME | Timestamp gestiti da TypeORM |

### 5.4 `ana_output_fields`

| Colonna | Tipo | Note |
|---------|------|------|
| `field_path` | VARCHAR(100) UNIQUE | Dot-notation del campo (es. `patient.ward`) |
| `label` | VARCHAR(100) | Etichetta UI |
| `group_name` | VARCHAR(50) | Sezione di appartenenza (Generale / Paziente / Preparazione Farmaco / Timestamp) |
| `description` | VARCHAR(255) | Descrizione estesa per la UI (nullable) |
| `required` | TINYINT(1) | 1 = campo obbligatorio (sempre incluso, non disattivabile) |
| `sort_order` | SMALLINT | Ordine di visualizzazione nella UI |

### 5.5 `app_config_output_fields`

| Colonna | Tipo | Note |
|---------|------|------|
| `field_path` | VARCHAR(100) UNIQUE | FK verso `ana_output_fields.field_path` |
| `sort_order` | SMALLINT | Ordine di restituzione nei JSON di risposta |

Tabella vuota = nessun filtro applicato (tutti i campi restituiti).

---

## 6. Migrazioni — Upgrade da versioni precedenti

Le migrazioni si applicano sequenzialmente sulle istanze esistenti. Per installazioni nuove usare direttamente il DDL della sezione 2.

### v2.0 — Rimozione sistema cappe

```sql
-- Rimuove FK e colonne da prescriptions
ALTER TABLE prescriptions DROP FOREIGN KEY fk_prescription_cappa;
ALTER TABLE prescriptions DROP INDEX idx_assigned_cappa;
ALTER TABLE prescriptions
  DROP COLUMN assigned_cappa_id,
  DROP COLUMN assigned_cappa,
  DROP COLUMN routing_info;

-- Rimuove colonne da routing_filters
ALTER TABLE routing_filters DROP COLUMN target_cappa_id;
ALTER TABLE routing_filters DROP COLUMN fallback_to_default;

-- Rimuove colonna da app_config
ALTER TABLE app_config DROP COLUMN default_routing_strategy;

-- Elimina tabelle cappe
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS cappa_queue;
DROP TABLE IF EXISTS cappa_specializations;
DROP TABLE IF EXISTS ana_cappa_statuses;
DROP TABLE IF EXISTS ana_cappa_types;
DROP TABLE IF EXISTS cappe;
SET FOREIGN_KEY_CHECKS = 1;
```

### v2.1 — Rimozione classificazione farmaci

```sql
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS drug_category_atc;
DROP TABLE IF EXISTS drug_category_aliases;
DROP TABLE IF EXISTS drug_categories;
DROP TABLE IF EXISTS atc_level2;
DROP TABLE IF EXISTS atc_level1;
SET FOREIGN_KEY_CHECKS = 1;
```

### v2.2 — Pulizia output fields obsoleti (riferimenti cappe)

```sql
-- Applica solo se queste colonne esistono nell'istanza
ALTER TABLE app_config DROP COLUMN IF EXISTS cappa_output_fields;
```

### v2.3 — Schema atomico prescrizioni + nuove tabelle

```sql
SET NAMES utf8mb4;

-- 1. Aggiunge tabella incoming_messages (se non esiste)
CREATE TABLE IF NOT EXISTS incoming_messages (
  id              VARCHAR(36)  NOT NULL,
  raw_payload     MEDIUMTEXT   NOT NULL,
  detected_format ENUM('HL7V2','FHIR_JSON','FHIR_XML','CDA_PRF','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  source_ip       VARCHAR(45)  NULL,
  parse_status    ENUM('SUCCESS','ERROR') NOT NULL DEFAULT 'SUCCESS',
  error_message   TEXT         NULL,
  prescription_id VARCHAR(36)  NULL,
  received_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Aggiunge colonne atomiche prep_* a prescriptions
--    (esegui solo le colonne mancanti nell'istanza target)
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS prep_code               VARCHAR(50)   NULL AFTER prep_category,
  ADD COLUMN IF NOT EXISTS prep_dosage_value       DECIMAL(10,3) NULL AFTER prep_dosage,
  ADD COLUMN IF NOT EXISTS prep_dosage_unit        VARCHAR(30)   NULL AFTER prep_dosage_value,
  ADD COLUMN IF NOT EXISTS prep_solvent            VARCHAR(100)  NULL AFTER prep_route,
  ADD COLUMN IF NOT EXISTS prep_volume             VARCHAR(30)   NULL AFTER prep_solvent,
  ADD COLUMN IF NOT EXISTS prep_volume_value       DECIMAL(10,3) NULL AFTER prep_volume,
  ADD COLUMN IF NOT EXISTS prep_volume_unit        VARCHAR(20)   NULL AFTER prep_volume_value,
  ADD COLUMN IF NOT EXISTS prep_infusion_rate      VARCHAR(50)   NULL AFTER prep_volume_unit,
  ADD COLUMN IF NOT EXISTS prep_final_concentration VARCHAR(50)  NULL AFTER prep_infusion_rate;

-- 3. Rimuove colonna JSON preparation (solo dopo migrazione dati)
--    ALTER TABLE prescriptions DROP COLUMN IF EXISTS preparation;

-- 4. Aggiunge tabelle output fields
CREATE TABLE IF NOT EXISTS ana_output_fields (
  id          INT          NOT NULL AUTO_INCREMENT,
  field_path  VARCHAR(100) NOT NULL,
  label       VARCHAR(100) NOT NULL,
  group_name  VARCHAR(50)  NOT NULL DEFAULT 'Generale',
  description VARCHAR(255) NULL,
  required    TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_field_path (field_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_config_output_fields (
  id          INT          NOT NULL AUTO_INCREMENT,
  field_path  VARCHAR(100) NOT NULL,
  sort_order  SMALLINT     NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uk_field_path (field_path),
  CONSTRAINT fk_acof_field_path
    FOREIGN KEY (field_path) REFERENCES ana_output_fields (field_path)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Popola il catalogo (idempotente)
-- (usare il seed completo della sezione 3)
```

---

## 7. Query utili

```sql
-- Prescrizioni in attesa di lavorazione
SELECT id, priority, patient_name, patient_ward, prep_drug, prep_dosage,
       prep_solvent, prep_volume, ts_received
FROM prescriptions
WHERE delivery_status = 'PENDING'
ORDER BY FIELD(priority,'STAT','URGENT','ROUTINE'), ts_received;

-- Ultimi payload ricevuti con errore
SELECT id, detected_format, source_ip, error_message, received_at
FROM incoming_messages
WHERE parse_status = 'ERROR'
ORDER BY received_at DESC
LIMIT 20;

-- Prescrizioni STAT delle ultime 24 ore
SELECT id, patient_name, patient_ward, prep_drug, prep_dosage, ts_received
FROM prescriptions
WHERE priority = 'STAT'
  AND ts_received >= NOW() - INTERVAL 24 HOUR
ORDER BY ts_received DESC;

-- Conteggio prescrizioni per categoria farmaco
SELECT prep_category, COUNT(*) AS totale
FROM prescriptions
GROUP BY prep_category
ORDER BY totale DESC;

-- Campi output attualmente abilitati
SELECT a.group_name, a.field_path, a.label, a.required
FROM ana_output_fields a
INNER JOIN app_config_output_fields c ON a.field_path = c.field_path
ORDER BY c.sort_order, a.sort_order;

-- Verifica stato tabelle
SELECT table_name, table_rows, data_length, index_length,
       ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb
FROM information_schema.tables
WHERE table_schema = 'hl7service'
ORDER BY table_name;
```
