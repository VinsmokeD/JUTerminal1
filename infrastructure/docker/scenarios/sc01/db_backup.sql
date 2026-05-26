-- NovaMed backup seed for SC-01
-- Educational data only

CREATE DATABASE IF NOT EXISTS novamed;
USE novamed;

INSERT INTO users (id, username, password, email, role) VALUES
(1, 'admin', MD5('P@ssw0rd_NovaMed_2023!'), 'admin@novamed.local', 'admin')
ON DUPLICATE KEY UPDATE
password = VALUES(password),
email = VALUES(email),
role = VALUES(role);

-- Cleartext artifact left in the backup intentionally for FLAG-SC01-2.
-- admin_password: P@ssw0rd_NovaMed_2023!
