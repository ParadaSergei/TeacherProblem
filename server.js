import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import multer from 'multer';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// PostgreSQL Pool Configuration
const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'teacher_problem',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
});

let isPgConnected = false;

// Test DB Connection and Initialize Database
async function initDatabase() {
  try {
    const client = await pool.connect();
    isPgConnected = true;
    console.log('✅ Connected to PostgreSQL database');

    // Run schema and seed if tables don't exist
    const checkUsersTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'users'
      );
    `);

    if (!checkUsersTable.rows[0].exists) {
      console.log('🔄 Initializing PostgreSQL database schema & seed data...');
      const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

      await client.query(schemaSql);
      await client.query(seedSql);
      console.log('✨ PostgreSQL database successfully initialized!');
    } else {
      // Check if users table is empty and seed if necessary
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      if (parseInt(userCount.rows[0].count, 10) === 0) {
        console.log('🔄 Users table is empty. Seeding initial user data...');
        const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
        await client.query(seedSql);
        console.log('✨ PostgreSQL seed data inserted successfully!');
      }
    }

    client.release();
  } catch (err) {
    isPgConnected = false;
    console.warn('⚠️ Could not connect to PostgreSQL database:', err.message);
  }
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS (PURE POSTGRESQL)
// -----------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pgConnected: isPgConnected });
});

// Helper check for DB connection
function checkDbConnection(res) {
  if (!isPgConnected) {
    res.status(503).json({ error: 'База данных PostgreSQL недоступна. Проверьте подключение.' });
    return false;
  }
  return true;
}

// Auth Login API (PostgreSQL query based on id, email, password_hash, name, role, is_admin, avatar, created_at)
app.post('/api/auth/login', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Укажите email и пароль' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, is_admin, avatar, created_at FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Пользователь с такой почтой не найден в базе данных' });
    }

    const user = result.rows[0];

    if (user.password_hash !== cleanPassword && user.password_hash !== password) {
      return res.status(401).json({ error: 'Неверный пароль' });
    }

    delete user.password_hash;
    return res.json({ user, mode: 'postgresql' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Ошибка сервера при авторизации в PostgreSQL: ' + err.message });
  }
});

// DELETE /api/scripts/:id - Delete script (Admin Panel)
app.delete('/api/scripts/:id', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const id = parseInt(req.params.id, 10);

  try {
    const result = await pool.query('DELETE FROM scripts WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Скрипт не найден' });
    }
    res.json({ message: 'Скрипт успешно удален из БД', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts/export - Export scripts table to Excel (.xlsx) file
app.get('/api/scripts/export', async (req, res) => {
  if (!checkDbConnection(res)) return;

  try {
    const result = await pool.query('SELECT * FROM scripts ORDER BY id ASC');
    const rows = result.rows.map(row => ({
      ID: row.id,
      Категория: row.category,
      Заголовок: row.title,
      Описание: row.description || '',
      Ситуация: row.situation || '',
      Текст_скрипта: row.script_text || '',
      Советы: Array.isArray(row.tips) ? row.tips.join('\n') : '',
      Теги: Array.isArray(row.tags) ? row.tags.join(', ') : '',
      Дата_создания: row.created_at
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Скрипты');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="teacher_scripts.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка экспорта в Excel: ' + err.message });
  }
});

// POST /api/scripts/import - Import scripts from Excel file (.xlsx / .csv) into PostgreSQL
app.post('/api/scripts/import', upload.single('file'), async (req, res) => {
  if (!checkDbConnection(res)) return;

  if (!req.file) {
    return res.status(400).json({ error: 'Загрузите файл Excel (.xlsx) или CSV' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'Загруженный файл Excel пуст' });
    }

    let importedCount = 0;

    for (const row of rows) {
      const category = row['Категория'] || row['category'] || 'general';
      const title = row['Заголовок'] || row['title'];
      const description = row['Описание'] || row['description'] || '';
      const situation = row['Ситуация'] || row['situation'] || title;
      const script_text = row['Текст_скрипта'] || row['script_text'] || row['scriptText'] || '';
      const tipsRaw = row['Советы'] || row['tips'] || '';
      const tagsRaw = row['Теги'] || row['tags'] || '';

      if (!title || !script_text) continue;

      const tips = typeof tipsRaw === 'string'
        ? tipsRaw.split('\n').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(tipsRaw) ? tipsRaw : []);

      const tags = typeof tagsRaw === 'string'
        ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
        : (Array.isArray(tagsRaw) ? tagsRaw : []);

      const query = `
        INSERT INTO scripts (category, title, description, situation, script_text, tips, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      await pool.query(query, [category, title, description, situation, script_text, tips, tags]);
      importedCount++;
    }

    res.json({ message: `Успешно импортировано ${importedCount} скриптов в базу данных!`, count: importedCount });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: 'Ошибка импорта файла Excel: ' + err.message });
  }
});

// GET /api/users - List all users (Admin Panel)
app.get('/api/users', async (req, res) => {
  if (!checkDbConnection(res)) return;

  try {
    const result = await pool.query(
      'SELECT id, email, name, role, is_admin, avatar, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Add new user account (Admin Panel)
app.post('/api/users', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { email, password, name, role, is_admin, avatar } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email и имя обязательны' });
  }

  const userPassword = password || '123456';
  const isAdminBool = Boolean(is_admin);

  try {
    const query = `
      INSERT INTO users (email, password_hash, name, role, is_admin, avatar)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, name, role, is_admin, avatar, created_at
    `;
    const values = [email, userPassword, name, role || 'Учитель', isAdminBool, avatar || null];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user account (Admin Panel)
app.put('/api/users/:id', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const id = parseInt(req.params.id, 10);
  const { email, password, name, role, is_admin, avatar } = req.body;

  try {
    let query = '';
    let values = [];

    if (password && password.trim() !== '') {
      query = `
        UPDATE users
        SET email = $1, password_hash = $2, name = $3, role = $4, is_admin = $5, avatar = COALESCE($6, avatar)
        WHERE id = $7
        RETURNING id, email, name, role, is_admin, avatar, created_at
      `;
      values = [email, password, name, role, Boolean(is_admin), avatar, id];
    } else {
      query = `
        UPDATE users
        SET email = $1, name = $2, role = $3, is_admin = $4, avatar = COALESCE($5, avatar)
        WHERE id = $6
        RETURNING id, email, name, role, is_admin, avatar, created_at
      `;
      values = [email, name, role, Boolean(is_admin), avatar, id];
    }

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete user account (Admin Panel)
app.delete('/api/users/:id', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const id = parseInt(req.params.id, 10);

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json({ message: 'Пользователь успешно удален', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts - List scripts
app.get('/api/scripts', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { category, search } = req.query;

  try {
    let query = 'SELECT * FROM scripts';
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      query += ` WHERE category = $${params.length}`;
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const searchIdx = params.length;
      query += params.length === 1 ? ' WHERE ' : ' AND ';
      query += `(LOWER(title) LIKE $${searchIdx} OR LOWER(situation) LIKE $${searchIdx} OR LOWER(script_text) LIKE $${searchIdx})`;
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scripts - Add script
app.post('/api/scripts', async (req, res) => {
  if (!checkDbConnection(res)) return;

  const { category, title, description, situation, script_text, tips, tags } = req.body;

  try {
    const query = `
      INSERT INTO scripts (category, title, description, situation, script_text, tips, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [category, title, description, situation, script_text, tips || [], tags || []];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await initDatabase();
});
