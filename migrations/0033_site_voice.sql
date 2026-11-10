-- The owner's voice on the site (owner, 2026-11-11): one short clip per page ("slot"), played from a floating button.
-- `autoplay` = the clip starts by itself the first time a visitor opens that page (they can turn it off). The audio
-- file is in R2 under voice/. Slots are listed in app/lib/voice.ts; a slot with no row has no button.
CREATE TABLE site_voice (
  slot       TEXT    PRIMARY KEY CHECK (length(slot) BETWEEN 2 AND 40),
  r2_key     TEXT    NOT NULL,
  mime       TEXT    NOT NULL,
  bytes      INTEGER NOT NULL CHECK (bytes > 0),
  autoplay   INTEGER NOT NULL DEFAULT 0 CHECK (autoplay IN (0, 1)),
  updated_by INTEGER REFERENCES users (id),
  updated_at INTEGER NOT NULL
);
