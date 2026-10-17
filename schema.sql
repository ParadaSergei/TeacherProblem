-- Schema for TeacherProblem PostgreSQL Database

DROP TABLE IF EXISTS scripts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users / Teachers Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100) NOT NULL DEFAULT 'Учитель',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scripts Table
CREATE TABLE scripts (
  id SERIAL PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  situation TEXT NOT NULL,
  script_text TEXT NOT NULL,
  tips TEXT[],
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_scripts_category ON scripts(category);
CREATE INDEX idx_users_email ON users(email);
