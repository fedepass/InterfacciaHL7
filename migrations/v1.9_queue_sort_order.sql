-- Migration v1.9: Ordinamento coda per cappa
-- Eseguire sul database prima di avviare la versione aggiornata del servizio

-- 1. Aggiunge colonna ordinamento coda alla tabella cappe (anagrafica)
ALTER TABLE cappe
  ADD COLUMN queue_sort_order ENUM('PRIORITY','ARRIVAL_ASC','ARRIVAL_DESC','WARD')
  NOT NULL DEFAULT 'ARRIVAL_ASC'
  AFTER max_queue_size;

-- 2. Aggiunge colonna reparto paziente alla tabella cappa_queue (configurazione coda)
ALTER TABLE cappa_queue
  ADD COLUMN patient_ward VARCHAR(100) NOT NULL DEFAULT ''
  AFTER patient_name;
