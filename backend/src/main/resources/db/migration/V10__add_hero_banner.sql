-- Storefront hero banner, editable from the admin. A single row (id = 1) -- there is only ever one
-- hero. Seeded with what the homepage previously hard-coded, so nothing changes until an admin edits it.
CREATE TABLE hero_banner (
    id          INT PRIMARY KEY CHECK (id = 1),
    image_url   VARCHAR(500) NOT NULL,
    title       VARCHAR(120) NOT NULL,
    subtitle    VARCHAR(200),
    button_text VARCHAR(40),
    button_link VARCHAR(300),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO hero_banner (id, image_url, title, subtitle, button_text)
VALUES (1, '/banner2.jpg', 'Forecast says Jess.', 'Wet weather essentials.', 'Shop the collection');
