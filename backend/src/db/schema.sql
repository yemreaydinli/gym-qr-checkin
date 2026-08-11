-- Spor Salonu QR Giriş Kontrol Sistemi - Veritabanı Şeması (PostgreSQL)
-- Proje ana hattı madde 6 ile birebir uyumludur.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============= USERS (Salon Sahibi Hesapları) =============
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============= GYMS (Multi-tenant kök tablo) =============
CREATE TABLE IF NOT EXISTS gyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  allowed_radius_meters INTEGER NOT NULL DEFAULT 100,
  duplicate_check_minutes INTEGER NOT NULL DEFAULT 5,
  qr_token VARCHAR(64) UNIQUE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gyms_owner_id ON gyms(owner_id);
CREATE INDEX IF NOT EXISTS idx_gyms_qr_token ON gyms(qr_token);

-- ============= MEMBERS (Üyeler - salona bağlı) =============
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255),
  photo_url VARCHAR(500),
  invite_code VARCHAR(64) UNIQUE,
  invite_code_expires_at TIMESTAMPTZ,
  invite_used_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gym_id, phone_number)
);
CREATE INDEX IF NOT EXISTS idx_members_gym_id ON members(gym_id);
CREATE INDEX IF NOT EXISTS idx_members_invite_code ON members(invite_code);

-- ============= MEMBERSHIPS =============
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  package_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  frozen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);

-- ============= CHECKINS =============
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  gym_id UUID NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  accuracy_meters DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  result VARCHAR(40) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_checkins_gym_id ON checkins(gym_id);
CREATE INDEX IF NOT EXISTS idx_checkins_member_id ON checkins(member_id);
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins("timestamp");

-- ============= MEMBER DEVICES (fingerprint - risk sinyali) =============
CREATE TABLE IF NOT EXISTS member_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_member_devices_member_id ON member_devices(member_id);
