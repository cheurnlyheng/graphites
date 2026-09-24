-- Bug found while testing: two near-simultaneous requests (React dev-mode double-invokes effects
-- on mount) could each see "this customer has no cart yet" before either had committed, so both
-- created one -- leaving two cart rows for the same customer. findByCustomerId() expects at most
-- one result, so any customer with a duplicate got a 500 on every cart request from then on.

-- Keep only the oldest cart per customer; drop any duplicates (and their items, if they had any).
DELETE FROM cart_item WHERE cart_id IN (
    SELECT id FROM cart c
    WHERE c.customer_id IS NOT NULL
      AND c.id NOT IN (
        SELECT DISTINCT ON (customer_id) id FROM cart WHERE customer_id IS NOT NULL ORDER BY customer_id, created_at ASC
      )
);
DELETE FROM cart WHERE customer_id IS NOT NULL
  AND id NOT IN (
    SELECT DISTINCT ON (customer_id) id FROM cart WHERE customer_id IS NOT NULL ORDER BY customer_id, created_at ASC
  );

-- Prevents this from ever happening again at the database level, regardless of application-level races.
CREATE UNIQUE INDEX cart_customer_id_unique ON cart(customer_id) WHERE customer_id IS NOT NULL;
