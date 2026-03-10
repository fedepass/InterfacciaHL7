-- Migration v2.2: Rimozione campi output relativi alla cappa assegnata
-- Da eseguire dopo v2.0_remove_cappe.sql su ambienti esistenti.

-- Rimuovi i campi assignedCappa dai cataloghi di output
DELETE FROM app_config_output_fields
  WHERE field_path IN ('assignedCappa.id', 'assignedCappa.name');

DELETE FROM ana_output_fields
  WHERE field_path IN ('assignedCappa.id', 'assignedCappa.name');

-- Aggiorna i sort_order dei campi successivi (patient.id → sort_order 5, etc.)
UPDATE ana_output_fields SET sort_order = 5  WHERE field_path = 'patient.id';
UPDATE ana_output_fields SET sort_order = 6  WHERE field_path = 'patient.ward';
UPDATE ana_output_fields SET sort_order = 7  WHERE field_path = 'preparation.drug';
UPDATE ana_output_fields SET sort_order = 8  WHERE field_path = 'preparation.category';
UPDATE ana_output_fields SET sort_order = 9  WHERE field_path = 'preparation.code';
UPDATE ana_output_fields SET sort_order = 10 WHERE field_path = 'preparation.dosage';
UPDATE ana_output_fields SET sort_order = 11 WHERE field_path = 'preparation.dosageValue';
UPDATE ana_output_fields SET sort_order = 12 WHERE field_path = 'preparation.dosageUnit';
UPDATE ana_output_fields SET sort_order = 13 WHERE field_path = 'preparation.solvent';
UPDATE ana_output_fields SET sort_order = 14 WHERE field_path = 'preparation.volume';
UPDATE ana_output_fields SET sort_order = 15 WHERE field_path = 'preparation.volumeValue';
UPDATE ana_output_fields SET sort_order = 16 WHERE field_path = 'preparation.volumeUnit';
UPDATE ana_output_fields SET sort_order = 17 WHERE field_path = 'timestamps.received';
UPDATE ana_output_fields SET sort_order = 18 WHERE field_path = 'timestamps.dispatched';
UPDATE ana_output_fields SET sort_order = 19 WHERE field_path = 'timestamps.requiredBy';
UPDATE ana_output_fields SET sort_order = 20 WHERE field_path = 'timestamps.sentToApi';

UPDATE app_config_output_fields SET sort_order = 5  WHERE field_path = 'patient.id';
UPDATE app_config_output_fields SET sort_order = 6  WHERE field_path = 'patient.ward';
UPDATE app_config_output_fields SET sort_order = 7  WHERE field_path = 'preparation.drug';
UPDATE app_config_output_fields SET sort_order = 8  WHERE field_path = 'preparation.category';
UPDATE app_config_output_fields SET sort_order = 9  WHERE field_path = 'preparation.code';
UPDATE app_config_output_fields SET sort_order = 10 WHERE field_path = 'preparation.dosage';
UPDATE app_config_output_fields SET sort_order = 11 WHERE field_path = 'preparation.dosageValue';
UPDATE app_config_output_fields SET sort_order = 12 WHERE field_path = 'preparation.dosageUnit';
UPDATE app_config_output_fields SET sort_order = 13 WHERE field_path = 'preparation.solvent';
UPDATE app_config_output_fields SET sort_order = 14 WHERE field_path = 'preparation.volume';
UPDATE app_config_output_fields SET sort_order = 15 WHERE field_path = 'preparation.volumeValue';
UPDATE app_config_output_fields SET sort_order = 16 WHERE field_path = 'preparation.volumeUnit';
UPDATE app_config_output_fields SET sort_order = 17 WHERE field_path = 'timestamps.received';
UPDATE app_config_output_fields SET sort_order = 18 WHERE field_path = 'timestamps.dispatched';
UPDATE app_config_output_fields SET sort_order = 19 WHERE field_path = 'timestamps.requiredBy';
UPDATE app_config_output_fields SET sort_order = 20 WHERE field_path = 'timestamps.sentToApi';

-- Aggiorna il JSON in app_config rimuovendo assignedCappa.*
UPDATE app_config
SET output_fields = JSON_REMOVE(
  JSON_REMOVE(output_fields,
    JSON_UNQUOTE(JSON_SEARCH(output_fields, 'one', 'assignedCappa.name'))
  ),
  JSON_UNQUOTE(JSON_SEARCH(output_fields, 'one', 'assignedCappa.id'))
)
WHERE id = 1
  AND JSON_SEARCH(output_fields, 'one', 'assignedCappa.id') IS NOT NULL;

-- Aggiorna descrizioni strategie di routing (rimozione riferimento alle cappe)
UPDATE ana_routing_strategies SET description = 'Assegna in base al carico corrente tra i destinatari attivi'           WHERE code = 'load_balance';
UPDATE ana_routing_strategies SET description = 'Instrada in base alla categoria del farmaco; fallback a load_balance'  WHERE code = 'drug_type';
UPDATE ana_routing_strategies SET description = 'Instrada in base al reparto del paziente; fallback a load_balance'    WHERE code = 'ward';
