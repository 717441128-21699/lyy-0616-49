import express from 'express';
import { dbOps, rowToTransaction, rowToUser, rowToService } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { page = 1, pageSize = 20 } = req.query;

  const { total } = await dbOps.get(`
    SELECT COUNT(*) as total FROM transactions
    WHERE from_user_id = ? OR to_user_id = ?
  `, [user.id, user.id]) as { total: number };

  const offset = (Number(page) - 1) * Number(pageSize);

  const rows = await dbOps.all(`
    SELECT t.*,
      fu.username as from_username, fu.avatar as from_avatar,
      tu.username as to_username, tu.avatar as to_avatar,
      s.status as service_status, s.duration as service_duration,
      p.title as post_title
    FROM transactions t
    LEFT JOIN users fu ON t.from_user_id = fu.id
    LEFT JOIN users tu ON t.to_user_id = tu.id
    LEFT JOIN services s ON t.service_id = s.id
    LEFT JOIN posts p ON s.post_id = p.id
    WHERE t.from_user_id = ? OR t.to_user_id = ?
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `, [user.id, user.id, Number(pageSize), offset]);

  const list = rows.map((row: any) => {
    const transaction = rowToTransaction(row);
    return {
      ...transaction,
      fromUser: {
        id: row.from_user_id,
        username: row.from_username,
        avatar: row.from_avatar,
      },
      toUser: {
        id: row.to_user_id,
        username: row.to_username,
        avatar: row.to_avatar,
      },
      service: row.service_id ? {
        id: row.service_id,
        status: row.service_status,
        duration: row.service_duration,
        postTitle: row.post_title,
      } : undefined,
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

router.get('/stats', requireAuth, async (req, res) => {
  const user = (req as any).user;

  const earnedRow = await dbOps.get(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE to_user_id = ? AND type = 'service'
  `, [user.id]) as { total: number };

  const spentRow = await dbOps.get(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE from_user_id = ? AND type = 'service'
  `, [user.id]) as { total: number };

  res.json({
    success: true,
    data: {
      totalEarned: earnedRow.total,
      totalSpent: spentRow.total,
      currentBalance: user.timeBalance,
    },
  });
});

export default router;
