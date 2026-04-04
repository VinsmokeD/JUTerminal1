-- NovaMed database — intentionally designed for training
-- Passwords are MD5 hashed (weak — intentional for training)

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

INSERT INTO patients (name, dob, diagnosis, ssn, user_id) VALUES
('John Smith', '1985-03-12', 'Hypertension, currently managed with lisinopril 10mg daily', '123-45-6789', 1),
('Mary Johnson', '1990-07-04', 'Type 2 Diabetes, HbA1c 7.2%, metformin 1000mg twice daily', '987-65-4321', 2),
('Robert Davis', '1975-11-22', 'Coronary artery disease, post-stent 2021', '456-78-9012', NULL),
('Susan Miller', '1988-05-18', 'Anxiety disorder, sertraline 50mg daily', '321-54-9876', NULL);
