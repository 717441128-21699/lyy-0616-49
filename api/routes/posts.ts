import express from 'express';
import { dbOps, rowToPost, rowToUser } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { category, type, page = 1, pageSize = 10, keyword } = req.query;

  let whereClause = 'WHERE p.status = ?';
  const params: any[] = ['active'];

  if (category) {
    whereClause += ' AND p.category = ?';
    params.push(category);
  }

  if (type) {
    whereClause += ' AND p.type = ?';
    params.push(type);
  }

  if (keyword) {
    whereClause += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countSql = `
    SELECT COUNT(*) as total FROM posts p ${whereClause}
  `;
  const { total } = await dbOps.get(countSql, params) as { total: number };

  const offset = (Number(page) - 1) * Number(pageSize);
  const sql = `
    SELECT p.*, u.username, u.credit_score, u.avatar
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await dbOps.all(sql, [...params, Number(pageSize), offset]);

  const list = rows.map((row: any) => {
    const post = rowToPost(row);
    return {
      ...post,
      user: {
        id: row.user_id,
        username: row.username,
        creditScore: row.credit_score,
        avatar: row.avatar,
      },
    };
  });

  res.json({
    success: true,
    data: {
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    },
  });
});

router.get('/search', async (req, res) => {
  const { keyword } = req.query;

  if (!keyword) {
    return res.json({ success: true, data: [] });
  }

  const sql = `
    SELECT p.*, u.username
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.status = 'active'
      AND (p.title LIKE ? OR p.description LIKE ?)
    ORDER BY p.created_at DESC
    LIMIT 20
  `;

  const rows = await dbOps.all(sql, [`%${keyword}%`, `%${keyword}%`]);
  const posts = rows.map((row: any) => rowToPost(row));

  res.json({ success: true, data: posts });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT p.*, u.username, u.email, u.credit_score, u.avatar, u.created_at as user_created_at
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `;

  const row = await dbOps.get(sql, [id]);
  if (!row) {
    return res.status(404).json({ success: false, error: '帖子不存在' });
  }

  const post = rowToPost(row);
  const user = rowToUser(row);

  res.json({
    success: true,
    data: {
      ...post,
      user: {
        id: user?.id,
        username: user?.username,
        creditScore: user?.creditScore,
        avatar: user?.avatar,
        joinDate: user?.createdAt,
      },
    },
  });
});

router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { title, description, category, type, duration, location } = req.body;

  if (!title || !description || !category || !type || !duration) {
    return res.status(400).json({ success: false, error: '请填写完整信息' });
  }

  if (type === 'request' && user.timeBalance < duration) {
    return res.status(400).json({ success: false, error: '时间积分不足，无法发布求助帖' });
  }

  const insertSql = `
    INSERT INTO posts (user_id, title, description, category, type, duration, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await dbOps.run(insertSql, [user.id, title, description, category, type, duration, location || null]);
  const postId = result.lastID as number;

  const selectSql = `
    SELECT p.*, u.username, u.credit_score, u.avatar
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `;
  const postRow = await dbOps.get(selectSql, [postId]);

  const post = rowToPost(postRow);

  res.json({
    success: true,
    data: {
      ...post,
      user: {
        id: postRow.user_id,
        username: postRow.username,
        creditScore: postRow.credit_score,
        avatar: postRow.avatar,
      },
    },
  });
});

export default router;
