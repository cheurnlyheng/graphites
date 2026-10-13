-- totp_secret stays null until setup is started, and totp_enabled stays false until the admin
-- confirms a code generated from it -- see AdminAuthService.setupTwoFactor/confirmTwoFactor.
ALTER TABLE admin_user ADD COLUMN totp_secret VARCHAR(64);
ALTER TABLE admin_user ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
