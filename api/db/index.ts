import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'timebank.db');

sqlite3.verbose();

export const db = new sqlite3.Database(dbPath);

function run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function exec(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function initDatabase() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(20),
      avatar VARCHAR(255),
      time_balance INTEGER DEFAULT 0,
      credit_score INTEGER DEFAULT 100,
      is_admin BOOLEAN DEFAULT 0,
      is_frozen BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      type VARCHAR(10) NOT NULL CHECK(type IN ('offer', 'request')),
      duration INTEGER NOT NULL,
      location VARCHAR(200),
      status VARCHAR(20) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      requester_id INTEGER NOT NULL,
      provider_id INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      scheduled_at DATETIME,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id),
      FOREIGN KEY (requester_id) REFERENCES users(id),
      FOREIGN KEY (provider_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      type VARCHAR(20) NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      last_read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'text',
      is_read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL,
      reviewee_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (reviewee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL,
      target_type VARCHAR(20) NOT NULL,
      target_id INTEGER NOT NULL,
      reason VARCHAR(100) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      admin_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      FOREIGN KEY (reporter_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
    CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(from_user_id, to_user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
  `);

  const adminHash = bcrypt.hashSync('admin123', 10);
  const userHash = bcrypt.hashSync('123456', 10);

  const adminExists = await get('SELECT id FROM users WHERE email = ?', ['admin@timebank.com']);
  if (!adminExists) {
    await run(
      'INSERT INTO users (username, email, password_hash, is_admin, time_balance) VALUES (?, ?, ?, 1, 100)',
      ['admin', 'admin@timebank.com', adminHash]
    );
  }

  const usersData = [
    ['张三', 'zhangsan@example.com', userHash, 20, 95],
    ['李四', 'lisi@example.com', userHash, 15, 88],
    ['王五', 'wangwu@example.com', userHash, 30, 92],
  ];

  for (const user of usersData) {
    const exists = await get('SELECT id FROM users WHERE email = ?', [user[1]]);
    if (!exists) {
      await run(
        'INSERT INTO users (username, email, password_hash, time_balance, credit_score) VALUES (?, ?, ?, ?, ?)',
        user
      );
    }
  }

  const postsData = [
    [2, '提供周末老人接送服务', '本人周末有空，可提供接送老人就医、购物等服务，驾驶技术娴熟，有多年驾龄。', 'transport', 'offer', 2, '朝阳区'],
    [3, '需要家政清洁帮助', '家中需要深度清洁，约2小时，主要是厨房和卫生间，希望有经验的朋友帮忙。', 'housework', 'request', 2, '海淀区'],
    [2, '可教授钢琴入门', '音乐专业毕业，可教授钢琴入门课程，适合儿童和成人零基础学习者。', 'teaching', 'offer', 1, '线上/西城区'],
    [4, '需要人陪伴老人聊天', '家中老人独居，希望有人能每周陪伴聊天、散步，每次2小时。', 'companion', 'request', 2, '东城区'],
    [3, '提供周末儿童托管', '有幼教经验，周末可提供2-6岁儿童托管服务，环境安全，有丰富的互动活动。', 'transport', 'offer', 4, '丰台区'],
    [4, '学习英语基础', '想学习英语日常对话，每周1-2次，每次1小时，希望找有耐心的朋友。', 'teaching', 'request', 1, '线上'],
  ];

  const postCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM posts');
  if (postCount?.count === 0) {
    for (const post of postsData) {
      await run(
        'INSERT INTO posts (user_id, title, description, category, type, duration, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [...post, 'active']
      );
    }
  }

  const convoCount = await get<{ count: number }>('SELECT COUNT(*) as count FROM conversations');
  if (convoCount?.count === 0) {
    await run('INSERT INTO conversations (post_id, created_at, updated_at) VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)', [1]);
    await run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [1, 2]);
    await run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', [1, 3]);
    await run(
      'INSERT INTO messages (conversation_id, sender_id, content, type, is_read) VALUES (?, ?, ?, ?, 0)',
      [1, 3, '你好，我看到你发布的接送老人服务，想咨询一下具体时间安排', 'text']
    );
    await run(
      'INSERT INTO messages (conversation_id, sender_id, content, type, is_read) VALUES (?, ?, ?, ?, 0)',
      [1, 2, '您好！周末全天都可以的，您家老人需要接送是在朝阳区是吗？', 'text']
    );
  }
}

export const dbOps = { run, get, all, exec };

export function rowToUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    avatar: row.avatar,
    timeBalance: row.time_balance,
    creditScore: row.credit_score,
    isAdmin: !!row.is_admin,
    isFrozen: !!row.is_frozen,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToPost(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    type: row.type,
    duration: row.duration,
    location: row.location,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToService(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    requesterId: row.requester_id,
    providerId: row.provider_id,
    duration: row.duration,
    status: row.status,
    scheduledAt: row.scheduled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export function rowToTransaction(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    serviceId: row.service_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    amount: row.amount,
    type: row.type,
    description: row.description,
    createdAt: row.created_at,
  };
}

export function rowToConversation(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    postId: row.post_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToMessage(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type,
    isRead: !!row.is_read,
    createdAt: row.created_at,
  };
}

export function rowToReview(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    serviceId: row.service_id,
    reviewerId: row.reviewer_id,
    revieweeId: row.reviewee_id,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export function rowToReport(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    reporterId: row.reporter_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    description: row.description,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  };
}
