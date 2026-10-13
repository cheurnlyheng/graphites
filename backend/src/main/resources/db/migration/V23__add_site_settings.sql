-- Singleton row (id is always 1) holding site-wide toggles -- just maintenance mode for now.
-- A real settings table rather than an env var so it can be flipped from the admin UI without a
-- redeploy, which is the whole point of a "mode" you reach for on short notice.
CREATE TABLE site_settings (
    id                   INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    maintenance_mode     BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_message  TEXT,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO site_settings (id, maintenance_mode) VALUES (1, FALSE);
