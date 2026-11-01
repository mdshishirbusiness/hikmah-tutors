-- So an import can be undone batch by batch (PRD §14.4).
ALTER TABLE tuitions ADD COLUMN import_batch_id INTEGER REFERENCES import_batches (id);
ALTER TABLE guardians ADD COLUMN import_batch_id INTEGER REFERENCES import_batches (id);
