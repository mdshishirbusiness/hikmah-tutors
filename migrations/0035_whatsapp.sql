-- WhatsApp Cloud API through YCloud, AI replies and the Admin Inbox (owner, 2026-11-18; docs/DECISIONS.md).
-- One chat per WhatsApp number. Messages are append-only: only delivery status may change, and the retention job may
-- clear the text (12 months) or the media key (90 days); rows are never deleted.

CREATE TABLE wa_chats (
  id              INTEGER PRIMARY KEY,
  wa_id           TEXT    NOT NULL UNIQUE,              -- E.164 without '+', e.g. 8801711000000
  phone           TEXT,                                 -- 01XXXXXXXXX when it is a Bangladesh mobile
  name            TEXT,                                 -- WhatsApp profile name
  kind            TEXT    NOT NULL DEFAULT 'unknown' CHECK (kind IN ('unknown', 'guardian', 'tutor', 'other')),
  guardian_id     INTEGER REFERENCES guardians (id),
  tutor_id        INTEGER REFERENCES tutors (id),
  lead_id         INTEGER REFERENCES leads (id),        -- the lead made from this chat (AI or staff)
  staff_id        INTEGER REFERENCES staff (id),        -- moderator who took the chat; NULL = not taken
  ai_paused_until INTEGER,                              -- AI sends nothing before this (12 h after a person replies)
  needs_human     TEXT,                                 -- why the AI handed over; NULL = nothing waiting
  urgent          INTEGER NOT NULL DEFAULT 0,           -- 1 = call request, complaint or anger
  suggestion      TEXT,                                 -- the AI's suggested reply while it is quiet
  last_in_at      INTEGER,                              -- their last message (the 24-hour window)
  last_out_at     INTEGER,
  last_human_at   INTEGER,                              -- last reply by the owner or a moderator (Inbox or phone)
  last_text       TEXT,                                 -- list preview
  unread          INTEGER NOT NULL DEFAULT 0,
  alerted_at      INTEGER,                              -- last alert to the owner's WhatsApp, so it isn't repeated
  pushed_at       INTEGER,                              -- last push for this chat
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);
CREATE INDEX wa_chats_recent ON wa_chats (last_in_at DESC);
CREATE INDEX wa_chats_staff ON wa_chats (staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX wa_chats_waiting ON wa_chats (needs_human) WHERE needs_human IS NOT NULL;

CREATE TABLE wa_messages (
  id          INTEGER PRIMARY KEY,
  chat_id     INTEGER NOT NULL REFERENCES wa_chats (id),
  ycloud_id   TEXT    UNIQUE,                           -- YCloud's message id; repeats of a webhook are ignored
  wamid       TEXT,
  direction   TEXT    NOT NULL CHECK (direction IN ('in', 'out')),
  sender      TEXT    NOT NULL CHECK (sender IN ('them', 'ai', 'staff', 'phone', 'system')),
  user_id     INTEGER REFERENCES users (id),            -- who sent it from the Inbox
  type        TEXT    NOT NULL DEFAULT 'text',          -- text, audio, image, video, document, sticker, location, other
  body        TEXT,                                     -- text or caption; NULL after 12 months
  media_key   TEXT,                                     -- R2 key under wa/; NULL after 90 days
  status      TEXT,                                     -- outgoing: accepted, sent, delivered, read, failed, dev
  error       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX wa_messages_chat ON wa_messages (chat_id, id);
CREATE INDEX wa_messages_wamid ON wa_messages (wamid) WHERE wamid IS NOT NULL;

CREATE TRIGGER wa_messages_fixed BEFORE UPDATE OF chat_id, direction, sender, user_id, type, created_at ON wa_messages
BEGIN SELECT RAISE(ABORT, 'wa_messages are append-only'); END;
CREATE TRIGGER wa_messages_body_cleared_only BEFORE UPDATE OF body ON wa_messages
WHEN NEW.body IS NOT NULL AND NEW.body IS NOT OLD.body
BEGIN SELECT RAISE(ABORT, 'a message text can only be cleared'); END;
CREATE TRIGGER wa_messages_no_delete BEFORE DELETE ON wa_messages
BEGIN SELECT RAISE(ABORT, 'wa_messages are append-only'); END;

-- Webhook events already handled (YCloud retries; one event may arrive twice). Kept 7 days, then deleted.
CREATE TABLE wa_events (
  id          TEXT    PRIMARY KEY,                      -- YCloud event id
  type        TEXT    NOT NULL,
  created_at  INTEGER NOT NULL
);

-- Owner settings for WhatsApp: alert_phone (owner's personal WhatsApp), ai_on ('1'/'0'), ai_budget_usd.
CREATE TABLE wa_settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- AI spend per Dhaka month, so the AI stops at the owner's budget.
CREATE TABLE wa_usage (
  month          TEXT    PRIMARY KEY,                   -- '2026-11'
  ai_calls       INTEGER NOT NULL DEFAULT 0,
  input_tokens   INTEGER NOT NULL DEFAULT 0,
  output_tokens  INTEGER NOT NULL DEFAULT 0,
  cost_micro_usd INTEGER NOT NULL DEFAULT 0,
  sent           INTEGER NOT NULL DEFAULT 0              -- messages we sent (Meta's first 1,000 a month are free)
);

-- Phones that asked for admin alerts (Web Push). The push carries no text: the phone fetches it after sign-in check.
CREATE TABLE push_subs (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id),
  endpoint    TEXT    NOT NULL UNIQUE,
  created_at  INTEGER NOT NULL
);

-- What a push was about, read by the service worker after it checks who is signed in. Kept 7 days.
CREATE TABLE push_notes (
  id          INTEGER PRIMARY KEY,
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  audience    TEXT    NOT NULL DEFAULT 'owner',         -- 'owner', 'inbox' (owner + Inbox moderators) or 'staff:<id>'
  created_at  INTEGER NOT NULL
);
