CREATE TABLE IF NOT EXISTS customers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(160),
  photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS photo_path TEXT;

CREATE TABLE IF NOT EXISTS vehicle_types (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(240)
);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity INTEGER NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id) ON DELETE RESTRICT,
  vehicle_make VARCHAR(80) NOT NULL,
  vehicle_model VARCHAR(80) NOT NULL,
  vehicle_year INTEGER NOT NULL CHECK (vehicle_year BETWEEN 1886 AND 2200),
  plate VARCHAR(20) NOT NULL,
  work_description VARCHAR(600) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente', 'en_proceso', 'terminado', 'entregado')),
  total NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  vehicle_photo_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS vehicle_photo_path TEXT;

CREATE TABLE IF NOT EXISTS job_payments (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method VARCHAR(20) NOT NULL CHECK (method IN ('efectivo', 'transaccion')),
  reference VARCHAR(120),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_sequences (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  vehicle_type_id INTEGER NOT NULL REFERENCES vehicle_types(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position > 0),
  name VARCHAR(120) NOT NULL,
  interval_km INTEGER NOT NULL CHECK (interval_km > 0),
  details VARCHAR(600),
  UNIQUE (vehicle_type_id, position)
);

CREATE TABLE IF NOT EXISTS service_prices (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  category VARCHAR(40) NOT NULL,
  price NUMERIC(12, 2) CHECK (price IS NULL OR price >= 0),
  notes VARCHAR(600),
  source_label VARCHAR(120),
  source_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO service_prices (name, category, price, notes, source_label, source_url) VALUES
  (
    'Afinado de motor (referencia Suzuki Alto 800 cc)',
    'Motor',
    200,
    'Anuncio para un Suzuki Alto K10 F8D 800 cc; referencia de un vehículo específico, no una tarifa promedio ni extrapolable a motores mayores.',
    'Taller Multiservicio · anuncio para Suzuki Alto',
    'https://www.google.com/search?q=%22Afinado+de+motor+Suzuki+Alto+K10+F8D+800+cc%22+%22200+Bs%22'
  ),
  (
    'Alineado',
    'Llantas',
    210,
    'Referencia publicada por Nissan Bolivia Posventa. Confirmar vigencia, tipo de vehículo y alcance del servicio para La Paz.',
    'Nissan Bolivia · Posventa',
    'https://www.google.com/search?q=site%3Anissan.com.bo+%22Alineado%22+%22210+Bs%22+%22Balanceo%22+%2254+Bs%22'
  ),
  (
    'Balanceo',
    'Llantas',
    54,
    'Nissan Bolivia Posventa publica Bs 54; la referencia consultada no aclara si corresponde a cada rueda o al servicio, confirmar antes de usar.',
    'Nissan Bolivia · Posventa',
    'https://www.google.com/search?q=site%3Anissan.com.bo+%22Alineado%22+%22210+Bs%22+%22Balanceo%22+%2254+Bs%22'
  ),
  (
    'Cambio de 4 llantas + balanceo + alineado',
    'Llantas',
    NULL,
    'No se encontró una tarifa pública comparable para el paquete completo. Referencias separadas: alineado Bs 210 y balanceo Bs 54; montaje y llantas se cotizan aparte.',
    'Nissan Bolivia · Posventa (servicios por separado)',
    'https://www.google.com/search?q=site%3Anissan.com.bo+%22Alineado%22+%22210+Bs%22+%22Balanceo%22+%2254+Bs%22'
  ),
  (
    'Reparación de motor',
    'Motor',
    NULL,
    'Requiere diagnóstico; el costo depende del daño, cilindrada, repuestos y mano de obra. No se encontró una tarifa pública comparable.',
    NULL,
    NULL
  ),
  (
    'Reparación de caja',
    'Transmisión',
    NULL,
    'Requiere diagnóstico; el costo depende del tipo de caja, daño y repuestos. No se encontró una tarifa pública comparable.',
    NULL,
    NULL
  ),
  (
    'Cambio de aceite y filtro (promedio de anuncios)',
    'Mantenimiento',
    396,
    'Promedio simple de dos promociones de Autokorp Bolivia (Bs 361 y Bs 430, redondeado desde Bs 395,50). Corresponden a fechas/paquetes distintos y no son una tarifa actual de La Paz.',
    'Autokorp Bolivia · dos anuncios promocionales',
    'https://www.google.com/search?q=Autokorp+Bolivia+%22cambio+de+aceite%22+%22Bs+361%22+OR+%22Bs+430%22'
  ),
  (
    'Revisión del sistema de frenos',
    'Frenos',
    NULL,
    'Cotizar según inspección, mano de obra y repuestos requeridos.',
    NULL,
    NULL
  ),
  (
    'Cambio de bujías',
    'Motor',
    NULL,
    'Cotizar según motor, tipo de bujía y mano de obra.',
    NULL,
    NULL
  ),
  (
    'Diagnóstico general',
    'Diagnóstico',
    NULL,
    'Definir si el diagnóstico se cobra por separado antes de iniciar la reparación.',
    NULL,
    NULL
  )
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS parts_quantity_idx ON parts(quantity, min_quantity);
CREATE INDEX IF NOT EXISTS job_payments_job_id_idx ON job_payments(job_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS service_prices_category_name_idx ON service_prices(category, name);
