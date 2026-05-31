-- NovaMed database â€” intentionally designed for training
-- Passwords are MD5 hashed (weak â€” intentional for training)

CREATE DATABASE IF NOT EXISTS novamed;
USE novamed;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(64) NOT NULL,  -- MD5 hash (weak, intentional)
    email VARCHAR(100),
    role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient',
    name VARCHAR(100)
);

INSERT INTO users (username, password, email, role, name) VALUES
('patient1', MD5('pass123'), 'patient1@novamed.local', 'patient', 'John Smith'),
('patient2', MD5('password'), 'patient2@novamed.local', 'patient', 'Mary Johnson'),
('doctor1', MD5('doctor123'), 'doctor1@novamed.local', 'doctor', 'Dr. Emily Chen'),
('admin', MD5('admin123'), 'admin@novamed.local', 'admin', 'James Harlow');

CREATE TABLE patients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    dob DATE,
    diagnosis TEXT,
    ssn VARCHAR(11),
    user_id INT REFERENCES users(id)
);

DELIMITER //
CREATE PROCEDURE seed_patient_range()
BEGIN
    DECLARE patient_id INT DEFAULT 1001;
    WHILE patient_id <= 1050 DO
        IF patient_id <> 1042 THEN
            INSERT INTO patients (id, name, dob, diagnosis, ssn, user_id) VALUES (
                patient_id,
                CONCAT('NovaMed Training Patient ', patient_id),
                DATE_ADD('1970-01-01', INTERVAL (patient_id % 12000) DAY),
                CONCAT('Simulated training record for IDOR enumeration marker ', patient_id),
                CONCAT(LPAD(patient_id % 900, 3, '0'), '-', LPAD(patient_id % 90, 2, '0'), '-', LPAD(patient_id, 4, '0')),
                NULL
            )
            ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                dob = VALUES(dob),
                diagnosis = VALUES(diagnosis),
                ssn = VALUES(ssn),
                user_id = VALUES(user_id);
        END IF;
        SET patient_id = patient_id + 1;
    END WHILE;
END//
DELIMITER ;

INSERT INTO patients (name, dob, diagnosis, ssn, user_id) VALUES
('John Smith', '1985-03-12', 'Hypertension, currently managed with lisinopril 10mg daily', '123-45-6789', 1),
('Mary Johnson', '1990-07-04', 'Type 2 Diabetes, HbA1c 7.2%, metformin 1000mg twice daily', '987-65-4321', 2),
('Robert Davis', '1975-11-22', 'Coronary artery disease, post-stent 2021', '456-78-9012', NULL),
('Susan Miller', '1988-05-18', 'Anxiety disorder, sertraline 50mg daily', '321-54-9876', NULL);

INSERT INTO patients (id, name, dob, diagnosis, ssn, user_id) VALUES
(1042, 'Aisha Rahman', '1992-09-14', 'Simulated oncology follow-up record - Parallax IDOR evidence marker: Patient 1042: Aisha Rahman', '104-20-4242', NULL)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
dob = VALUES(dob),
diagnosis = VALUES(diagnosis),
ssn = VALUES(ssn),
user_id = VALUES(user_id);

CALL seed_patient_range();
DROP PROCEDURE seed_patient_range;
