-- Without this, nothing orders the cart's items -- the API returned whatever order Postgres felt
-- like for a given scan, which is not guaranteed stable and visibly changed after an UPDATE (e.g.
-- changing a line's quantity could make it jump to a different position in the list). Ordering by
-- when each line was first added keeps the cart visually stable regardless of what's edited.
ALTER TABLE cart_item ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
