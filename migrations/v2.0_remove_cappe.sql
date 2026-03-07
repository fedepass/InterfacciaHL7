-- v2.0: rimozione tabelle cappe e riferimenti nelle prescrizioni

-- Rimuovi FK e indice su assigned_cappa_id prima di droppare la colonna
ALTER TABLE prescriptions DROP FOREIGN KEY fk_prescription_cappa;
ALTER TABLE prescriptions DROP INDEX idx_assigned_cappa;

-- Rimuovi colonne cappa dalle prescrizioni
ALTER TABLE prescriptions
  DROP COLUMN assigned_cappa_id,
  DROP COLUMN assigned_cappa,
  DROP COLUMN routing_info;

-- Rimuovi colonne cappa dai filtri
ALTER TABLE routing_filters DROP COLUMN target_cappa_id;
ALTER TABLE routing_filters DROP COLUMN fallback_to_default;

-- Elimina tabelle cappe (ordine: prima le dipendenti)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS cappa_queue;
DROP TABLE IF EXISTS cappa_specializations;
DROP TABLE IF EXISTS ana_cappa_statuses;
DROP TABLE IF EXISTS ana_cappa_types;
DROP TABLE IF EXISTS cappe;
SET FOREIGN_KEY_CHECKS = 1;
