-- Migration v1.11: Classificazione ATC (Anatomical Therapeutic Chemical)
-- WHO Collaborating Centre for Drug Statistics Methodology — WHOCC/FHI Oslo
-- Tabelle: ana_atc_level1, ana_atc_level2, ana_drug_category_atc

-- ─── 1. Primo livello ATC: 14 gruppi anatomici ───────────────────────────────

CREATE TABLE IF NOT EXISTS ana_atc_level1 (
  code     CHAR(1)      NOT NULL PRIMARY KEY,
  name_en  VARCHAR(150) NOT NULL,
  name_it  VARCHAR(150) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO ana_atc_level1 (code, name_en, name_it) VALUES
  ('A', 'Alimentary tract and metabolism',                                  'Apparato gastrointestinale e metabolismo'),
  ('B', 'Blood and blood forming organs',                                   'Sangue ed organi emopoietici'),
  ('C', 'Cardiovascular system',                                            'Sistema cardiovascolare'),
  ('D', 'Dermatologicals',                                                  'Dermatologici'),
  ('G', 'Genito urinary system and sex hormones',                           'Sistema genito-urinario ed ormoni sessuali'),
  ('H', 'Systemic hormonal preparations, excl. sex hormones',               'Preparati ormonali sistemici, escl. ormoni sessuali'),
  ('J', 'Antiinfectives for systemic use',                                  'Antimicrobici per uso sistemico'),
  ('L', 'Antineoplastic and immunomodulating agents',                       'Antineoplastici ed immunomodulatori'),
  ('M', 'Musculo-skeletal system',                                          'Sistema muscolo-scheletrico'),
  ('N', 'Nervous system',                                                   'Sistema nervoso'),
  ('P', 'Antiparasitic products, insecticides and repellents',              'Antiparassitari, insetticidi e repellenti'),
  ('R', 'Respiratory system',                                               'Sistema respiratorio'),
  ('S', 'Sensory organs',                                                   'Organi di senso'),
  ('V', 'Various',                                                          'Vari')
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_it=VALUES(name_it);

-- ─── 2. Secondo livello ATC: sottogruppi terapeutici ─────────────────────────

CREATE TABLE IF NOT EXISTS ana_atc_level2 (
  code        VARCHAR(5)   NOT NULL PRIMARY KEY,   -- es. L01, J01, B01
  name_en     VARCHAR(200) NOT NULL,
  name_it     VARCHAR(200) NOT NULL,
  level1_code CHAR(1)      NOT NULL,
  CONSTRAINT fk_atc_l2_l1 FOREIGN KEY (level1_code)
    REFERENCES ana_atc_level1(code) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO ana_atc_level2 (code, name_en, name_it, level1_code) VALUES
  -- ── Gruppo A: Apparato gastrointestinale e metabolismo ────────────────────
  ('A01', 'Stomatological preparations',                    'Preparati stomatologici',                           'A'),
  ('A02', 'Drugs for acid related disorders',               'Farmaci per disturbi acido-correlati',              'A'),
  ('A03', 'Drugs for functional GI disorders',              'Farmaci per disturbi GI funzionali',                'A'),
  ('A04', 'Antiemetics and antinauseants',                  'Antiemetici e antinausea',                         'A'),
  ('A06', 'Laxatives',                                      'Lassativi',                                         'A'),
  ('A10', 'Drugs used in diabetes',                         'Farmaci usati nel diabete',                         'A'),
  ('A11', 'Vitamins',                                       'Vitamine',                                          'A'),
  ('A12', 'Mineral supplements',                            'Supplementi minerali',                              'A'),
  ('A14', 'Anabolic agents for systemic use',               'Agenti anabolizzanti per uso sistemico',            'A'),
  -- ── Gruppo B: Sangue ed organi emopoietici ────────────────────────────────
  ('B01', 'Antithrombotic agents',                          'Agenti antitrombotici',                             'B'),
  ('B02', 'Antihemorrhagics',                               'Antiemorragici',                                    'B'),
  ('B03', 'Antianemic preparations',                        'Preparati antianemici',                             'B'),
  ('B05', 'Blood substitutes and perfusion solutions',      'Succedanei del sangue e soluzioni di perfusione',  'B'),
  ('B06', 'Other hematological agents',                     'Altri agenti ematologici',                          'B'),
  -- ── Gruppo C: Sistema cardiovascolare ────────────────────────────────────
  ('C01', 'Cardiac therapy',                                'Terapia cardiaca',                                  'C'),
  ('C02', 'Antihypertensives',                              'Antipertensivi',                                    'C'),
  ('C03', 'Diuretics',                                      'Diuretici',                                         'C'),
  ('C07', 'Beta blocking agents',                           'Beta-bloccanti',                                    'C'),
  ('C08', 'Calcium channel blockers',                       'Calcioantagonisti',                                  'C'),
  ('C09', 'Renin-angiotensin system agents',                'Agenti sul sistema renina-angiotensina',            'C'),
  -- ── Gruppo H: Preparati ormonali sistemici ────────────────────────────────
  ('H01', 'Pituitary and hypothalamic hormones',            'Ormoni ipofisari e ipotalamici',                    'H'),
  ('H02', 'Corticosteroids for systemic use',               'Corticosteroidi per uso sistemico',                 'H'),
  ('H03', 'Thyroid therapy',                                'Terapia tiroidea',                                  'H'),
  ('H04', 'Pancreatic hormones',                            'Ormoni pancreatici',                                'H'),
  ('H05', 'Calcium homeostasis',                            'Omeostasi del calcio',                              'H'),
  -- ── Gruppo J: Antimicrobici per uso sistemico ─────────────────────────────
  ('J01', 'Antibacterials for systemic use',                'Antibatterici per uso sistemico',                   'J'),
  ('J02', 'Antimycotics for systemic use',                  'Antimicotici per uso sistemico',                    'J'),
  ('J04', 'Antimycobacterials',                             'Antimicobatterici',                                 'J'),
  ('J05', 'Antivirals for systemic use',                    'Antivirali per uso sistemico',                      'J'),
  ('J06', 'Immune sera and immunoglobulins',                'Sieri immuni e immunoglobuline',                    'J'),
  ('J07', 'Vaccines',                                       'Vaccini',                                           'J'),
  -- ── Gruppo L: Antineoplastici ed immunomodulatori ─────────────────────────
  ('L01', 'Antineoplastic agents',                          'Farmaci antineoplastici',                           'L'),
  ('L02', 'Endocrine therapy',                              'Terapia endocrina antitumorale',                    'L'),
  ('L03', 'Immunostimulants',                               'Immunostimolanti',                                  'L'),
  ('L04', 'Immunosuppressants',                             'Immunosoppressori',                                 'L'),
  -- ── Gruppo M: Sistema muscolo-scheletrico ─────────────────────────────────
  ('M01', 'Antiinflammatory and antirheumatic products',    'Antinfiammatori e antireumatici',                  'M'),
  ('M03', 'Muscle relaxants',                               'Miorilassanti',                                     'M'),
  ('M05', 'Drugs for treatment of bone diseases',           'Farmaci per malattie ossee',                        'M'),
  -- ── Gruppo N: Sistema nervoso ─────────────────────────────────────────────
  ('N01', 'Anesthetics',                                    'Anestetici',                                        'N'),
  ('N02', 'Analgesics',                                     'Analgesici',                                        'N'),
  ('N03', 'Antiepileptics',                                 'Antiepilettici',                                    'N'),
  ('N05', 'Psycholeptics',                                  'Psicolettici',                                      'N'),
  ('N06', 'Psychoanaleptics',                               'Psicoanalettici',                                   'N'),
  ('N07', 'Other nervous system drugs',                     'Altri farmaci del sistema nervoso',                 'N'),
  -- ── Gruppo R: Sistema respiratorio ───────────────────────────────────────
  ('R01', 'Nasal preparations',                             'Preparati nasali',                                  'R'),
  ('R03', 'Drugs for obstructive airway diseases',          'Farmaci per patologie ostruttive delle vie aeree',  'R'),
  ('R05', 'Cough and cold preparations',                    'Preparati per tosse e raffreddore',                 'R'),
  ('R06', 'Antihistamines for systemic use',                'Antistaminici per uso sistemico',                   'R'),
  -- ── Gruppo V: Vari ───────────────────────────────────────────────────────
  ('V03', 'All other therapeutic products',                 'Tutti gli altri prodotti terapeutici',              'V'),
  ('V04', 'Diagnostic agents',                              'Agenti diagnostici',                                 'V'),
  ('V06', 'General nutrients',                              'Nutrienti generali',                                 'V'),
  ('V08', 'Contrast media',                                 'Mezzi di contrasto',                                 'V')
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_it=VALUES(name_it), level1_code=VALUES(level1_code);

-- ─── 3. Relazione N:M: categorie interne ↔ codici ATC ─────────────────────────

CREATE TABLE IF NOT EXISTS ana_drug_category_atc (
  id                 INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  drug_category_code VARCHAR(50) NOT NULL,
  atc_code           VARCHAR(5)  NOT NULL,
  UNIQUE KEY uk_cat_atc (drug_category_code, atc_code),
  CONSTRAINT fk_dca_category FOREIGN KEY (drug_category_code)
    REFERENCES ana_drug_categories(code) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dca_atc FOREIGN KEY (atc_code)
    REFERENCES ana_atc_level2(code) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── 4. Seed: associazioni categorie interne → ATC ───────────────────────────

INSERT INTO ana_drug_category_atc (drug_category_code, atc_code) VALUES
  ('CHEMOTHERAPY',     'L01'),   -- Farmaci antineoplastici
  ('CHEMOTHERAPY',     'L02'),   -- Terapia endocrina antitumorale
  ('IMMUNOSUPPRESSANT','L04'),   -- Immunosoppressori
  ('IMMUNOSUPPRESSANT','L03'),   -- Immunostimolanti (biologici)
  ('ANTIBIOTIC',       'J01'),   -- Antibatterici sistemici
  ('ANTIBIOTIC',       'J02'),   -- Antimicotici sistemici
  ('ANTIBIOTIC',       'J05'),   -- Antivirali sistemici
  ('ANTIBIOTIC',       'J04'),   -- Antimicobatterici
  ('ANTICOAGULANT',    'B01'),   -- Agenti antitrombotici
  ('NUTRITION',        'B05'),   -- Soluzioni di perfusione e succedanei sangue
  ('NUTRITION',        'V06'),   -- Nutrienti generali (NPT)
  ('NUTRITION',        'A12'),   -- Supplementi minerali IV
  ('NUTRITION',        'A11'),   -- Vitamine IV
  ('ANALGESIC_OPIOID', 'N02'),   -- Analgesici (include oppioidi N02A)
  ('ANALGESIC_OPIOID', 'N01'),   -- Anestetici (overlapping: fentanyl, ketamina)
  ('INSULIN',          'A10')    -- Farmaci usati nel diabete (insuline A10A)
ON DUPLICATE KEY UPDATE atc_code=VALUES(atc_code);
