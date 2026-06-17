import express from 'express';
import { dbOps, rowToUser, rowToTransaction } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', requireAdmin, async (_req, res) => {
  const totalUsers = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  const totalPosts = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM posts');
  const totalServices = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM services WHERE status = ?', ['completed']);
  const totalHours = await dbOps.get<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = ?', ['service']);
  const pendingReports = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM reports WHERE status = ?', ['pending']);
  const frozenUsers = await dbOps.get<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE is_frozen = 1');

  res.json({
    success: true,
    data: {
      totalUsers: totalUsers?.count ?? 0,
      totalPosts: totalPosts?.count ?? 0,
      totalServices: totalServices?.count ?? 0,
      totalHours: totalHours?.total ?? 0,
      pendingReports: pendingReports?.count ?? 0,
      frozenUsers: frozenUsers?.count ?? 0,
    },
  });
});

router.get('/users', requireAdmin, async (req, res) => {
  const { page = 1, pageSize = 20, keyword, status } = req.query;

  let whereClause = '';
  const params: any[] = [];

  if (keyword) {
    whereClause = 'WHERE username LIKE ? OR email LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  if (status === 'frozen') {
    whereClause += (whereClause ? ' AND' : ' WHERE') + ' is_frozen = 1';
  }

  const countResult = await dbOps.get<{ total: number }>(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
  const total = countResult?.total ?? 0;

  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = await dbOps.all<any>(`
    SELECT u.*,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count,
      (SELECT COUNT(*) FROM services WHERE (provider_id = u.id OR requester_id = u.id) AND status = 'completed') as service_count,
      (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating
    FROM users u
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, Number(pageSize), offset]);

  const list = rows.map((row: any) => {
    const user = rowToUser(row);
    return {
      ...user,
      postCount: row.post_count,
      serviceCount: row.service_count,
      avgRating: row.avg_rating ? Math.round(row.avg_rating * 10) / 10 : null,
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

router.post('/users/:id/gift-points', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const admin = (req as any).user;
  const { points, reason } = req.body;

  if (!points || points <= 0) {
    return res.status(400).json({ success: false, error: '请输入有效的积分数量' });
  }

  const userRow = await dbOps.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!userRow) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  try {
    await dbOps.run('BEGIN');

    await dbOps.run(`
      UPDATE users SET time_balance = time_balance + ? WHERE id = ?
    `, [points, id]);

    await dbOps.run(`
      INSERT INTO transactions (from_user_id, to_user_id, amount, type, description)
      VALUES (?, ?, ?, 'gift', ?)
    `, [admin.id, id, points, reason || '管理员赠送初始积分']);

    await dbOps.run('COMMIT');

    const updatedUser = await dbOps.get<{ time_balance: number }>('SELECT time_balance FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        newBalance: updatedUser?.time_balance,
      },
      message: `已成功赠送 ${points} 时间积分`,
    });
  } catch (error) {
    await dbOps.run('ROLLBACK');
    res.status(500).json({ success: false, error: '赠送积分失败' });
  }
});

router.post('/users/:id/freeze', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const userRow = await dbOps.get<{ is_admin: number }>('SELECT * FROM users WHERE id = ?', [id]);
  if (!userRow) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  if (userRow.is_admin) {
    return res.status(400).json({ success: false, error: '不能冻结管理员账户' });
  }

  await dbOps.run(`
    UPDATE users SET is_frozen = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [id]);

  res.json({ success: true, message: '账户已冻结' });
});

router.post('/users/:id/unfreeze', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const userRow = await dbOps.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!userRow) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  await dbOps.run(`
    UPDATE users SET is_frozen = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `, [id]);

  res.json({ success: true, message: '账户已解冻' });
});

router.get('/transactions', requireAdmin, async (_req, res) => {
  const rows = await dbOps.all<any>(`
    SELECT t.*,
      fu.username as from_username,
      tu.username as to_username,
      p.title as post_title
    FROM transactions t
    LEFT JOIN users fu ON t.from_user_id = fu.id
    LEFT JOIN users tu ON t.to_user_id = tu.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN posts p ON s.post_id = p.id
    ORDER BY t.created_at DESC
    LIMIT 100
  `);

  const list = rows.map((row: any) => ({
    ...rowToTransaction(row),
    fromUser: { id: row.from_user_id, username: row.from_username },
    toUser: { id: row.to_user_id, username: row.to_username },
    postTitle: row.post_title,
  }));

  res.json({ success: true, data: list });
});

export default router;
