import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

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

// Fallback in-memory storage if PostgreSQL connection fails
let isPgConnected = false;

// Mock initial in-memory data for graceful fallback
let inMemoryUsers = [
  {
    id: 1,
    email: 'admin@school.edu.ru',
    password_hash: 'admin123',
    name: 'Администратор Системы',
    role: 'Завуч / Администратор',
    is_admin: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    created_at: new Date()
  },
  {
    id: 2,
    email: 'teacher@school.edu.ru',
    password_hash: 'teacher123',
    name: 'Мария Сергеевна',
    role: 'Учитель начальных классов',
    is_admin: false,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
    created_at: new Date()
  }
];

let inMemoryScripts = [
  {
    id: 1,
    category: 'parents',
    title: 'Родитель возмущен оценкой ребенка и обвиняет учительницу в предвзятости',
    description: 'Родитель пишет в мессенджере с требованиями пересмотреть оценку за контрольную работу.',
    situation: 'Родитель пишет: "Вы специально занижаете оценки моему сыну! У него всегда были пятерки!"',
    script_text: 'Здравствуйте, [Имя Отчество]!\nЯ понимаю ваше волнение за успеваемость [Имя ребенка].\n\nОценка за контрольную работу выставлена строго по критериям оценивания: [указать критерий].\n\nЯ с удовольствием покажу вам работу и критерии на личной встрече или отправлю скан работы с подробными комментариями. Наша общая цель — помочь [Имя ребенка] разобраться в теме. Давайте обсудим, как лучше подтянуть этот материал?',
    tips: ['Сохраняйте спокойный и доброжелательный тон.', 'Переводите разговор от эмоций к фактам и критериям.', 'Подчеркните, что вы на одной стороне с родителем.'],
    tags: ['Родители', 'Оценки', 'Конфликт', 'Мессенджеры'],
    created_at: new Date()
  },
  {
    id: 2,
    category: 'students',
    title: 'Ученик открыто хамит или отказывается выполнять задание на уроке',
    description: 'Ученик демонстративно заявляет: "Я не буду это делать, мне ваш предмет не нужен!"',
    situation: 'Ученик громко отказывается выполнять задание перед всем классом.',
    script_text: '[Имя ученика], я слышу твое мнение. Сейчас время работы всего класса, и это задание обязательно для выполнения программы.\n\nПредлагаю сейчас приступить к заданию, а после урока мы можем отдельно обсудить, что именно тебя беспокоит в этом материале.',
    tips: ['Не вступайте в публичную перепалку при всем классе.', 'Дайте ученику "сохранить лицо".'],
    tags: ['Ученики', 'Дисциплина', 'Срыв урока'],
    created_at: new Date()
  }
];

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
    console.warn('⚠️ Could not connect to PostgreSQL. Falling back to in-memory mode:', err.message);
  }
}

// -----------------------------------------------------------------------------
// REST API ENDPOINTS
// -----------------------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', pgConnected: isPgConnected });
});

// Auth Login API
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Укажите email и пароль' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    if (isPgConnected) {
      const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Пользователь с такой почтой не найден' });
      }
      const user = result.rows[0];
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }
      delete user.password_hash;
      return res.json({ user });
    } else {
      const user = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
      if (!user) {
        return res.status(401).json({ error: 'Пользователь не найден' });
      }
      if (user.password_hash !== password) {
        return res.status(401).json({ error: 'Неверный пароль' });
      }
      const { password_hash, ...userData } = user;
      return res.json({ user: userData });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/scripts/:id - Delete script (Admin Panel)
app.delete('/api/scripts/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    if (isPgConnected) {
      const result = await pool.query('DELETE FROM scripts WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Скрипт не найден' });
      }
      res.json({ message: 'Скрипт успешно удален из БД', id });
    } else {
      const idx = inMemoryScripts.findIndex(s => s.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Скрипт не найден' });
      }
      inMemoryScripts.splice(idx, 1);
      res.json({ message: 'Скрипт успешно удален из памяти', id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users - List all users (Admin Panel)
app.get('/api/users', async (req, res) => {
  try {
    if (isPgConnected) {
      const result = await pool.query('SELECT id, email, name, role, is_admin, avatar, created_at FROM users ORDER BY id ASC');
      res.json(result.rows);
    } else {
      const safeUsers = inMemoryUsers.map(({ password_hash, ...rest }) => rest);
      res.json(safeUsers);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users - Add new user account (Admin Panel)
app.post('/api/users', async (req, res) => {
  const { email, password, name, role, is_admin, avatar } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: 'Email и имя обязательны' });
  }

  const userPassword = password || '123456';
  const isAdminBool = Boolean(is_admin);

  try {
    if (isPgConnected) {
      const query = `
        INSERT INTO users (email, password_hash, name, role, is_admin, avatar)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, name, role, is_admin, avatar, created_at
      `;
      const values = [email, userPassword, name, role || 'Учитель', isAdminBool, avatar || null];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } else {
      const newUser = {
        id: inMemoryUsers.length + 1,
        email,
        password_hash: userPassword,
        name,
        role: role || 'Учитель',
        is_admin: isAdminBool,
        avatar: avatar || null,
        created_at: new Date()
      };
      inMemoryUsers.push(newUser);
      const { password_hash, ...userData } = newUser;
      res.status(201).json(userData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id - Update user account (Admin Panel)
app.put('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { email, password, name, role, is_admin, avatar } = req.body;

  try {
    if (isPgConnected) {
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
    } else {
      const idx = inMemoryUsers.findIndex(u => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      inMemoryUsers[idx] = {
        ...inMemoryUsers[idx],
        email: email || inMemoryUsers[idx].email,
        name: name || inMemoryUsers[idx].name,
        role: role || inMemoryUsers[idx].role,
        is_admin: is_admin !== undefined ? Boolean(is_admin) : inMemoryUsers[idx].is_admin,
        avatar: avatar || inMemoryUsers[idx].avatar,
        password_hash: password ? password : inMemoryUsers[idx].password_hash
      };
      const { password_hash, ...userData } = inMemoryUsers[idx];
      res.json(userData);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id - Delete user account (Admin Panel)
app.delete('/api/users/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  try {
    if (isPgConnected) {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      res.json({ message: 'Пользователь успешно удален', id });
    } else {
      const idx = inMemoryUsers.findIndex(u => u.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      inMemoryUsers.splice(idx, 1);
      res.json({ message: 'Пользователь успешно удален', id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scripts - List scripts
app.get('/api/scripts', async (req, res) => {
  const { category, search } = req.query;

  try {
    if (isPgConnected) {
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
    } else {
      let filtered = [...inMemoryScripts];
      if (category && category !== 'all') {
        filtered = filtered.filter(s => s.category === category);
      }
      if (search && search.trim() !== '') {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(s =>
          s.title.toLowerCase().includes(q) ||
          s.situation.toLowerCase().includes(q) ||
          s.script_text.toLowerCase().includes(q)
        );
      }
      res.json(filtered);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scripts - Add script
app.post('/api/scripts', async (req, res) => {
  const { category, title, description, situation, script_text, tips, tags } = req.body;

  try {
    if (isPgConnected) {
      const query = `
        INSERT INTO scripts (category, title, description, situation, script_text, tips, tags)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [category, title, description, situation, script_text, tips || [], tags || []];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } else {
      const newScript = {
        id: inMemoryScripts.length + 1,
        category,
        title,
        description,
        situation,
        script_text,
        tips: tips || [],
        tags: tags || [],
        created_at: new Date()
      };
      inMemoryScripts.unshift(newScript);
      res.status(201).json(newScript);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await initDatabase();
});
