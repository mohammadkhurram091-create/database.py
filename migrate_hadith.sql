-- Add hadith text columns to hadith_references.
-- Safe on empty table. All columns nullable — no data loss possible.

ALTER TABLE hadith_references
    ADD COLUMN title               VARCHAR(200) NULL AFTER hadith_reference_id,
    ADD COLUMN topic               VARCHAR(100) NULL AFTER title,
    ADD COLUMN narrator            VARCHAR(150) NULL AFTER topic,
    ADD COLUMN hadith_text_arabic  TEXT         NULL AFTER narrator,
    ADD COLUMN hadith_text_english TEXT         NULL AFTER hadith_text_arabic;

CREATE INDEX idx_hadith_topic ON hadith_references(topic);