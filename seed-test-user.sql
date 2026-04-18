USE inventory_sales_hub;

INSERT INTO users (email, name, password_hash)
VALUES (
  'testuser',
  'Test User',
  '$2b$10$cy/1WBSLzUfRZpd6JvzPf.LvSOXAeGIKOOtK26IMVHd25Hl.cattC'
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash);
