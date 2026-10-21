require('dotenv').config();

const { randomUUID } = require('node:crypto');
const { mkdir, open, unlink } = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { pool, initializeDatabase } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3000);
const uploadsDirectory = path.join(__dirname, '..', 'uploads');
const imageExtensions = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdir(uploadsDirectory, { recursive: true }).then(
        () => callback(null, uploadsDirectory),
        callback,
      );
    },
    filename: (_req, file, callback) => {
      callback(null, `${randomUUID()}${imageExtensions.get(file.mimetype)}`);
    },
  }),
  limits: { fields: 0, files: 1, fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!imageExtensions.has(file.mimetype)) {
      const error = new Error('La imagen debe ser JPG, PNG o WebP.');
      error.status = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4200' }));
app.use('/uploads', express.static(uploadsDirectory, { dotfiles: 'deny', index: false }));
app.use(express.json({ limit: '100kb' }));

const definitions = {
  customers: {
    table: 'customers',
    fields: {
      name: { kind: 'text', required: true, max: 120 },
      phone: { kind: 'text', max: 40 },
      email: { kind: 'text', max: 160 },
    },
    imageColumn: 'photo_path',
    list: 'SELECT id, name, phone, email, photo_path, created_at FROM customers ORDER BY name',
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
      j.work_description, j.status, j.total, j.vehicle_photo_path, j.created_at,
      COALESCE(payment_totals.paid_total, 0) AS paid_total,
      j.total - COALESCE(payment_totals.paid_total, 0) AS balance
      FROM jobs j
      JOIN customers c ON c.id = j.customer_id
      JOIN vehicle_types vt ON vt.id = j.vehicle_type_id
      LEFT JOIN (
        SELECT job_id, SUM(amount) AS paid_total
        FROM job_payments
        GROUP BY job_id
      ) payment_totals ON payment_totals.job_id = j.id
      ORDER BY j.created_at DESC`,
    imageColumn: 'vehicle_photo_path',
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
    const raw = body?.[name];
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
    if (name === 'jobs') {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: jobRows } = await client.query(
          'SELECT id FROM jobs WHERE id = $1 FOR UPDATE',
          [id],
        );
        if (!jobRows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'No se encontró el registro.' });
        }
        const { rows: paymentRows } = await client.query(
          'SELECT COALESCE(SUM(amount), 0) AS paid_total FROM job_payments WHERE job_id = $1',
          [id],
        );
        if (Number(values.total) < Number(paymentRows[0].paid_total)) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'El total del trabajo no puede ser menor que los pagos registrados.' });
        }
        const { rows } = await client.query(
          `UPDATE ${definition.table} SET ${assignments} WHERE id = $${params.length} RETURNING *`,
          params,
        );
        await client.query('COMMIT');
        return res.json(rows[0]);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }
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
    const deleteQuery = definition.imageColumn
      ? `DELETE FROM ${definition.table} WHERE id = $1 RETURNING ${definition.imageColumn} AS image_path`
      : `DELETE FROM ${definition.table} WHERE id = $1`;
    const { rows, rowCount } = await pool.query(deleteQuery, [id]);
    if (!rowCount) return res.status(404).json({ error: 'No se encontró el registro.' });
    if (rows[0]?.image_path) {
      try {
        await removeStoredImage(rows[0].image_path);
      } catch (error) {
        console.error('No se pudo eliminar el archivo de imagen asociado.', error);
      }
    }
    res.status(204).end();
  }));
}

async function removeStoredImage(photoPath) {
  if (!photoPath) return;
  const filename = path.basename(photoPath);
  if (photoPath !== `/uploads/${filename}`) {
    throw new Error('La ruta de imagen almacenada no es válida.');
  }
  try {
    await unlink(path.join(uploadsDirectory, filename));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function hasValidImageSignature(file) {
  const handle = await open(file.path, 'r');
  try {
    const header = Buffer.alloc(12);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    if (file.mimetype === 'image/jpeg') {
      return bytesRead >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    }
    if (file.mimetype === 'image/png') {
      return bytesRead >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    }
    return file.mimetype === 'image/webp'
      && bytesRead >= 12
      && header.toString('ascii', 0, 4) === 'RIFF'
      && header.toString('ascii', 8, 12) === 'WEBP';
  } finally {
    await handle.close();
  }
}

async function saveImage(req, res, table, column) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    if (req.file) await removeStoredImage(`/uploads/${req.file.filename}`);
    return res.status(400).json({ error: 'El identificador no es válido.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Selecciona una imagen JPG, PNG o WebP.' });
  const photoPath = `/uploads/${req.file.filename}`;
  let validImage;
  try {
    validImage = await hasValidImageSignature(req.file);
  } catch (error) {
    try {
      await removeStoredImage(photoPath);
    } catch (cleanupError) {
      console.error('No se pudo limpiar una imagen inválida.', cleanupError);
    }
    throw error;
  }
  if (!validImage) {
    await removeStoredImage(photoPath);
    return res.status(415).json({ error: 'El contenido del archivo no coincide con una imagen válida.' });
  }

  let existingRows;
  try {
    ({ rows: existingRows } = await pool.query(
      `SELECT ${column} FROM ${table} WHERE id = $1`,
      [id],
    ));
  } catch (error) {
    try {
      await removeStoredImage(photoPath);
    } catch (cleanupError) {
      console.error('No se pudo limpiar la imagen tras fallar la consulta.', cleanupError);
    }
    throw error;
  }
  if (!existingRows.length) {
    await removeStoredImage(photoPath);
    return res.status(404).json({ error: 'No se encontró el registro.' });
  }

  let rows;
  try {
    ({ rows } = await pool.query(
      `UPDATE ${table} SET ${column} = $1 WHERE id = $2 RETURNING ${column}`,
      [photoPath, id],
    ));
  } catch (error) {
    try {
      await removeStoredImage(photoPath);
    } catch (cleanupError) {
      console.error('No se pudo limpiar la imagen tras fallar su registro.', cleanupError);
    }
    throw error;
  }

  try {
    await removeStoredImage(existingRows[0][column]);
  } catch (error) {
    console.error('No se pudo eliminar la imagen anterior.', error);
  }
  res.json({ [column]: rows[0][column] });
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

app.get('/api/jobs/:id/payments', asyncRoute(async (req, res) => {
  const jobId = Number(req.params.id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ error: 'El identificador no es válido.' });
  }
  const { rows } = await pool.query(
    `SELECT id, job_id, amount, method, reference, paid_at
      FROM job_payments
      WHERE job_id = $1
      ORDER BY paid_at DESC, id DESC`,
    [jobId],
  );
  const { rowCount } = await pool.query('SELECT id FROM jobs WHERE id = $1', [jobId]);
  if (!rowCount) return res.status(404).json({ error: 'No se encontró el trabajo.' });
  res.json(rows);
}));

app.post('/api/jobs/:id/payments', asyncRoute(async (req, res) => {
  const jobId = Number(req.params.id);
  if (!Number.isInteger(jobId) || jobId < 1) {
    return res.status(400).json({ error: 'El identificador no es válido.' });
  }
  const { values, errors } = validate(req.body, {
    amount: { kind: 'number', required: true, min: 0 },
    method: { kind: 'enum', required: true, values: ['efectivo', 'transaccion'] },
    reference: { kind: 'text', max: 120 },
  });
  if (errors.length) return res.status(400).json({ error: errors.join(' ') });
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount - Number(amount.toFixed(2))) > 1e-8) {
    return res.status(400).json({ error: 'El importe debe ser mayor que cero y tener como máximo dos decimales.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: jobRows } = await client.query(
      'SELECT total FROM jobs WHERE id = $1 FOR UPDATE',
      [jobId],
    );
    if (!jobRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No se encontró el trabajo.' });
    }
    const { rows: paymentRows } = await client.query(
      'SELECT COALESCE(SUM(amount), 0) AS paid_total FROM job_payments WHERE job_id = $1',
      [jobId],
    );
    const balance = Number(jobRows[0].total) - Number(paymentRows[0].paid_total);
    if (amount > balance + 1e-8) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El pago supera el saldo pendiente del trabajo.' });
    }
    const { rows } = await client.query(
      `INSERT INTO job_payments (job_id, amount, method, reference)
        VALUES ($1, $2, $3, $4)
        RETURNING id, job_id, amount, method, reference, paid_at`,
      [jobId, amount, values.method, values.reference],
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

for (const [name, definition] of Object.entries(definitions)) {
  registerResourceRoutes(name, definition);
}

app.post('/api/customers/:id/photo', imageUpload.single('photo'), asyncRoute(async (req, res) => {
  await saveImage(req, res, 'customers', 'photo_path');
}));

app.post('/api/jobs/:id/vehicle-photo', imageUpload.single('photo'), asyncRoute(async (req, res) => {
  await saveImage(req, res, 'jobs', 'vehicle_photo_path');
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser un JSON válido.' });
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      error: error.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen no puede superar los 5 MB.'
        : 'No se pudo procesar la imagen enviada.',
    });
  }
  if (error.status === 415) return res.status(415).json({ error: error.message });
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
