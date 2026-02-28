-- MediCare Pro - PostgreSQL Schema
-- For Render Postgres: Run this in the Render psql shell or via your DATABASE_URL
-- psql $DATABASE_URL -f database/schema.sql

-- Staff / Admin
CREATE TABLE IF NOT EXISTS staff (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'receptionist' CHECK (role IN ('admin','doctor','nurse','receptionist')),
    phone VARCHAR(20),
    specialization VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    patient_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('male','female','other')),
    blood_group VARCHAR(5),
    address TEXT,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    fcm_token VARCHAR(500),
    portal_password VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    type VARCHAR(50) DEFAULT 'consultation',
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','completed','cancelled','no-show')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    findings TEXT,
    recommendations TEXT,
    file_path VARCHAR(500),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','reviewed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bills
CREATE TABLE IF NOT EXISTS bills (
    id SERIAL PRIMARY KEY,
    bill_number VARCHAR(20) UNIQUE NOT NULL,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    subtotal NUMERIC(10,2) DEFAULT 0,
    tax NUMERIC(10,2) DEFAULT 0,
    discount NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0,
    paid_amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','partial','paid','cancelled')),
    payment_method VARCHAR(50),
    notes TEXT,
    due_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bill Items
CREATE TABLE IF NOT EXISTS bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    description VARCHAR(200) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL
);

-- Notification Logs
CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
    type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('sent','failed','pending')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user (password: Admin@123 — CHANGE THIS after first login!)
-- Hash generated with bcrypt rounds=10
INSERT INTO staff (name, email, password, role)
VALUES ('Admin', 'admin@medicare.com', '$2a$10$rBnO6P5jT2rGlpVg7Nqxle4NWMH1PuXxJtUVqpKYkLz3e7nTmfK2', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Updated_at auto-update function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['staff','patients','appointments','reports','bills']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated ON %s', t, t);
    EXECUTE format('CREATE TRIGGER trg_%s_updated BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END $$;
