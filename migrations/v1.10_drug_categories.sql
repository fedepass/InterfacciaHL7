-- Migration v1.10: Adattamento schema tabelle ana_drug_categories e ana_drug_category_aliases
-- Le tabelle esistono già (create da schema.sql Docker) ma con struttura parziale.
-- Questo script le porta al formato completo richiesto dall'applicazione.

-- ─── 1. ana_drug_categories ──────────────────────────────────────────────────

-- Rinomina 'name' → 'label' (più descrittivo per uso API)
ALTER TABLE ana_drug_categories
  CHANGE COLUMN `name` `label` VARCHAR(100) NOT NULL;

-- Aggiunge colonna active (sostituisce/affianca sort_order)
ALTER TABLE ana_drug_categories
  ADD COLUMN `active`     TINYINT(1) NOT NULL DEFAULT 1   AFTER `description`,
  ADD COLUMN `created_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `active`,
  ADD COLUMN `updated_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

-- ─── 2. ana_drug_category_aliases ────────────────────────────────────────────

-- Espande alias da varchar(50) a varchar(100)
ALTER TABLE ana_drug_category_aliases
  MODIFY COLUMN `alias` VARCHAR(100) NOT NULL;

-- Aggiunge language e created_at
ALTER TABLE ana_drug_category_aliases
  ADD COLUMN `language`   VARCHAR(10) NOT NULL DEFAULT 'IT' AFTER `category_code`,
  ADD COLUMN `created_at` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `language`;

-- Aggiunge FK se non esiste già (ignora se duplicata)
ALTER TABLE ana_drug_category_aliases
  DROP FOREIGN KEY IF EXISTS fk_alias_category;
ALTER TABLE ana_drug_category_aliases
  ADD CONSTRAINT fk_alias_category
    FOREIGN KEY (category_code) REFERENCES ana_drug_categories(code)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. Seed categorie mancanti ──────────────────────────────────────────────

INSERT INTO ana_drug_categories (code, label, description, active) VALUES
  ('CHEMOTHERAPY',    'Chemioterapia',          'Farmaci citotossici e antitumorali per terapia oncologica', 1),
  ('IMMUNOSUPPRESSANT','Immunosoppressori',      'Farmaci per la soppressione del sistema immunitario', 1),
  ('ANTIBIOTIC',      'Antibiotici',             'Farmaci antibatterici per uso endovenoso', 1),
  ('ANTICOAGULANT',   'Anticoagulanti',          'Farmaci anticoagulanti e antitrombotici', 1),
  ('NUTRITION',       'Nutrizione parenterale',  'Soluzioni nutrizionali per via endovenosa (NPT/TPN)', 1),
  ('ANALGESIC_OPIOID','Analgesici oppioidi',     'Oppioidi e analgesici potenti per controllo del dolore', 1),
  ('INSULIN',         'Insulina',                'Preparazioni insuliniche per infusione continua', 1)
ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), active=VALUES(active);

-- ─── 4. Seed alias mancanti ──────────────────────────────────────────────────

INSERT INTO ana_drug_category_aliases (alias, category_code, language) VALUES
  -- CHEMOTHERAPY
  ('CHEMIOTERAPICI',    'CHEMOTHERAPY', 'IT'),
  ('CHEMIOTERAPICO',    'CHEMOTHERAPY', 'IT'),
  ('CHEMIO',            'CHEMOTHERAPY', 'IT'),
  ('CHEMO',             'CHEMOTHERAPY', 'EN'),
  ('ONCOLOGICI',        'CHEMOTHERAPY', 'IT'),
  ('ONCOLOGICO',        'CHEMOTHERAPY', 'IT'),
  ('ANTITUMORALI',      'CHEMOTHERAPY', 'IT'),
  ('ANTITUMORALE',      'CHEMOTHERAPY', 'IT'),
  ('CITOTOSSICI',       'CHEMOTHERAPY', 'IT'),
  ('CITOTOSSICO',       'CHEMOTHERAPY', 'IT'),
  -- IMMUNOSUPPRESSANT
  ('IMMUNOSOPPRESSORI',  'IMMUNOSUPPRESSANT', 'IT'),
  ('IMMUNOSOPPRESSORE',  'IMMUNOSUPPRESSANT', 'IT'),
  ('IMMUNOSUPPRESSANTS', 'IMMUNOSUPPRESSANT', 'EN'),
  -- ANTIBIOTIC
  ('ANTIBIOTICI',  'ANTIBIOTIC', 'IT'),
  ('ANTIBIOTICO',  'ANTIBIOTIC', 'IT'),
  ('ANTIBIOTICS',  'ANTIBIOTIC', 'EN'),
  -- ANTICOAGULANT
  ('ANTICOAGULANTI',  'ANTICOAGULANT', 'IT'),
  ('ANTICOAGULANTE',  'ANTICOAGULANT', 'IT'),
  ('ANTICOAGULANTS',  'ANTICOAGULANT', 'EN'),
  -- NUTRITION
  ('NUTRIZIONE',             'NUTRITION', 'IT'),
  ('NUTRIZIONE_PARENTERALE', 'NUTRITION', 'IT'),
  ('NPT',                    'NUTRITION', 'IT'),
  ('TPN',                    'NUTRITION', 'EN'),
  -- ANALGESIC_OPIOID
  ('OPPIOIDI',   'ANALGESIC_OPIOID', 'IT'),
  ('OPPIOIDE',   'ANALGESIC_OPIOID', 'IT'),
  ('ANALGESICI', 'ANALGESIC_OPIOID', 'IT'),
  ('ANALGESICO', 'ANALGESIC_OPIOID', 'IT'),
  ('OPIOIDS',    'ANALGESIC_OPIOID', 'EN'),
  -- INSULIN
  ('INSULINE', 'INSULIN', 'IT'),
  ('INSULINA', 'INSULIN', 'IT')
ON DUPLICATE KEY UPDATE category_code=VALUES(category_code), language=VALUES(language);
