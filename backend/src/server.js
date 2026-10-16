require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool, initializeDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4200' }));
app.use(express.json({ limit: '100kb' }));

const definitions = {
  customers: {
    table: 'customers',
    fields: {
      name: { kind: 'text', required: true, max: 120 },
      phone: { kind: 'text', max: 40 },
      email: { kind: 'text', max: 160 },
    },
    list: 'SELECT id, name, phone, email, created_at FROM customers ORDER BY name',
  },
  vehicleTypes: {
    table: 'vehicle_types',
    fields: {
      name: { kind: 'text', required: true, max: 80 },
      description: { kind: 'text', max: 240 },
    },
    list: 'SELECT id, name, description FROM vehicle_types ORDER BY name',
  },
  parts: {
    table: 'parts',
    fields: {
      sku: { kind: 'text', required: true, max: 60 },
      name: { kind: 'text', required: true, max: 120 },
      category: { kind: 'text', max: 80 },
      quantity: { kind: 'integer', required: true, min: 0 },
      min_quantity: { kind: 'integer', required: true, min: 0 },
      unit_price: { kind: 'number', required: true, min: 0 },
    },
    list: 'SELECT id, sku, name, category, quantity, min_quantity, unit_price FROM parts ORDER BY name',
  },
  jobs: {
    table: 'jobs',
    fields: {
      customer_id: { kind: 'integer', required: true, min: 1 },
      vehicle_type_id: { kind: 'integer', required: true, min: 1 },
      vehicle_make: { kind: 'text', required: true, max: 80 },
      vehicle_model: { kind: 'text', required: true, max: 80 },
      vehicle_year: { kind: 'integer', required: true, min: 1886, max: 2200 },
      plate: { kind: 'text', required: true, max: 20 },
      work_description: { kind: 'text', required: true, max: 600 },
      status: {
        kind: 'enum',
        required: true,
        values: ['pendiente', 'en_proceso', 'terminado', 'entregado'],
      },
      total: { kind: 'number', required: true, min: 0 },
    },
    list: `SELECT j.id, j.customer_id, c.name AS customer_name,
      j.vehicle_type_id, vt.name AS vehicle_type_name,
      j.vehicle_make, j.vehicle_model, j.vehicle_year, j.plate,
      j.work_description, j.status, j.total, j.created_at
      FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      JOIN vehicle_types vt ON vt.id = j.vehicle_type_id
      ORDER BY j.created_at DESC`,
  },
  maintenance: {
    table: 'maintenance_sequences',
    fields: {
      vehicle_type_id: { kind: 'integer', required: true, min: 1 },
      position: { kind: 'integer', required: true, min: 1 },
      name: { kind: 'text', required: true, max: 120 },
      interval_km: { kind: 'integer', required: true, min: 1 },
      details: { kind: 'text', max: 600 },
    },
    list: `SELECT m.id, m.vehicle_type_id, vt.name AS vehicle_type_name,
      m.position, m.name, m.interval_km, m.details
      FROM maintenance_sequences m
      JOIN vehicle_types vt ON vt.id = m.vehicle_type_id
      ORDER BY vt.name, m.position`,
  },
};

function validate(body, fields) {
  const values = {};
  const errors = [];

  for (const [name, rule] of Object.entries(fields)) {
    const raw = body[name];
    if (raw === undefined || raw === null || raw === '') {
      if (rule.required) errors.push(`${name} es obligatorio.`);
      else values[name] = null;
      continue;
    }

    if (rule.kind === 'text') {
      if (typeof raw !== 'string' || raw.trim().length === 0) {
        if (rule.required) errors.push(`${name} debe ser texto válido.`);
        else values[name] = null;
      } else if (raw.trim().length > rule.max) {
        errors.push(`${name} no puede superar ${rule.max} caracteres.`);
      } else {
        values[name] = raw.trim();
      }
    } else if (rule.kind === 'integer') {
      const value = Number(raw);
      if (!Number.isInteger(value) || value < rule.min || (rule.max && value > rule.max)) {
        errors.push(`${name} debe ser un número entero válido.`);
      } else {
        values[name] = value;
      }
    } else if (rule.kind === 'number') {
      const value = Number(raw);
      if (!Number.isFinite(value) || value < rule.min) {
        errors.push(`${name} debe ser un número igual o mayor a ${rule.min}.`);
      } else {
        values[name] = value;
      }
    } else if (rule.kind === 'enum') {
      if (!rule.values.includes(raw)) errors.push(`${name} no tiene un valor permitido.`);
      else values[name] = raw;
    }
  }

  return { values, errors };
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function registerResourceRoutes(name, definition) {
  const base = `/api/${name}`;
  const fieldNames = Object.keys(definition.fields);

  app.get(base, asyncRoute(async (_req, res) => {
    const { rows } = await pool.query(definition.list);
    res.json(rows);
  }));

  app.post(base, asyncRoute(async (req, res) => {
    const { values, errors } = validate(req.body, definition.fields);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const columns = fieldNames.join(', ');
    const placeholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
    const params = fieldNames.map((field) => values[field]);
    const { rows } = await pool.query(
      `INSERT INTO ${definition.table} (${columns}) VALUES (${placeholders}) RETURNING *`,
      params,
    );
    res.status(201).json(rows[0]);
  }));

  app.put(`${base}/:id`, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'El identificador no es válido.' });
    const { values, errors } = validate(req.body, definition.fields);
    if (errors.length) return res.status(400).json({ error: errors.join(' ') });

    const assignments = fieldNames.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const params = fieldNames.map((field) => values[field]);
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE ${definition.table} SET ${assignments} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!rows.length) return res.status(404).json({ error: 'No se encontró el registro.' });
    res.json(rows[0]);
  }));

  app.delete(`${base}/:id`, asyncRoute(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'El identificador no es válido.' });
    const { rowCount } = await pool.query(`DELETE FROM ${definition.table} WHERE id = $1`, [id]);
    if (!rowCount) return res.status(404).json({ error: 'No se encontró el registro.' });
    res.status(204).end();
  }));
}

app.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

app.get('/api/dashboard', asyncRoute(async (_req, res) => {
  const [customers, parts, jobs, lowStock, recentJobs] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total FROM customers'),
    pool.query('SELECT COUNT(*)::int AS total FROM parts'),
    pool.query("SELECT COUNT(*)::int AS total FROM jobs WHERE status <> 'entregado'"),
    pool.query('SELECT COUNT(*)::int AS total FROM parts WHERE quantity <= min_quantity'),
    pool.query(`${definitions.jobs.list} LIMIT 5`),
  ]);
  res.json({
    customers: customers.rows[0].total,
    parts: parts.rows[0].total,
    openJobs: jobs.rows[0].total,
    lowStock: lowStock.rows[0].total,
    recentJobs: recentJobs.rows,
  });
}));

for (const [name, definition] of Object.entries(definitions)) {
  registerResourceRoutes(name, definition);
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con ese código o nombre.' });
  }
  if (error.code === '23503') {
    return res.status(409).json({ error: 'No se puede eliminar o guardar: hay registros relacionados.' });
  }
  if (error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({ error: 'Los datos no cumplen las reglas de la base de datos.' });
  }
  res.status(500).json({ error: 'Ocurrió un error en el servidor. Revisa la terminal para ver el detalle.' });
});

async function start() {
  await initializeDatabase();
  app.listen(port, () => console.log(`API del taller disponible en http://localhost:${port}`));
}

start().catch((error) => {
  console.error('No se pudo iniciar la API. Verifica PostgreSQL y el archivo backend/.env.', error);
  process.exitCode = 1;
});
