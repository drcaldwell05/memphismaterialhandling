CREATE TABLE IF NOT EXISTS project_requests (
  reference TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  needs TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  timing TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'accepted', 'failed', 'uncertain')),
  email_error TEXT,
  email_status_at TEXT
);
