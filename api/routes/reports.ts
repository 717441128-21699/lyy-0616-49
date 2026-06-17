import express from 'express';
import { dbOps, rowToReport, rowToUser, rowToPost } from '../db/index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { type, targetId, reason, description } = req.body;

  if (!type || !targetId || !reason) {
    return res.status(400).json({ success: false, error: '请填写完整举报信息' });
  }

  if (!['post', 'user', 'service'].includes(type)) {
    return res.status(400).json({ success: false, error: '无效的举报类型' });
  }

  const result = await dbOps.run(`
    INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
    VALUES (?, ?, ?, ?, ?)
  `, [user.id, type, targetId, reason, description || null]);

  const reportRow = await dbOps.get(`
    SELECT r.*, u.username as reporter_username
    FROM reports r
    LEFT JOIN users u ON r.reporter_id = u.id
    WHERE r.id = ?
  `, [result.lastID]);

  const report = rowToReport(reportRow);

  res.json({ success: true, data: report });
});

router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;

  let whereClause = '';
  const params: any[] = [];

  if (status) {
    whereClause = 'WHERE r.status = ?';
    params.push(status);
  }

  const rows = await dbOps.all(`
    SELECT r.*,
      rep.username as reporter_username, rep.avatar as reporter_avatar
    FROM reports r
    LEFT JOIN users rep ON r.reporter_id = rep.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT 50
  `, params);

  const reports = await Promise.all(rows.map(async (row: any) => {
    const report = rowToReport(row);

    let targetUser, targetPost, targetService;

    if (row.target_type === 'user') {
      const userRow = await dbOps.get('SELECT username, avatar FROM users WHERE id = ?', [row.target_id]);
      targetUser = userRow ? { id: row.target_id, username: userRow.username, avatar: userRow.avatar } : null;
    } else if (row.target_type === 'post') {
      const postRow = await dbOps.get('SELECT title, user_id FROM posts WHERE id = ?', [row.target_id]);
      targetPost = postRow ? { id: row.target_id, title: postRow.title, userId: postRow.user_id } : null;
    } else if (row.target_type === 'service') {
      const serviceRow = await dbOps.get(`
        SELECT s.*, p.title as post_title,
          ru.username as requester_username, ru.avatar as requester_avatar,
          pu.username as provider_username, pu.avatar as provider_avatar
        FROM services s
        LEFT JOIN posts p ON s.post_id = p.id
        LEFT JOIN users ru ON s.requester_id = ru.id
        LEFT JOIN users pu ON s.provider_id = pu.id
        WHERE s.id = ?
      `, [row.target_id]);
      if (serviceRow) {
        targetService = {
          id: serviceRow.id,
          postId: serviceRow.post_id,
          postTitle: serviceRow.post_title,
          duration: serviceRow.duration,
          status: serviceRow.status,
          requester: {
            id: serviceRow.requester_id,
            username: serviceRow.requester_username,
            avatar: serviceRow.requester_avatar,
          },
          provider: {
            id: serviceRow.provider_id,
            username: serviceRow.provider_username,
            avatar: serviceRow.provider_avatar,
          },
        };
      }
    }

    return {
      ...report,
      reporter: {
        id: row.reporter_id,
        username: row.reporter_username,
        avatar: row.reporter_avatar,
      },
      targetUser,
      targetPost,
      targetService,
    };
  }));

  res.json({ success: true, data: reports });
});

router.post('/:id/process', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const { action, note } = req.body;

  if (!action || !['freeze', 'warn', 'dismiss'].includes(action)) {
    return res.status(400).json({ success: false, error: '无效的处理动作' });
  }

  const reportRow = await dbOps.get('SELECT * FROM reports WHERE id = ?', [id]);
  if (!reportRow) {
    return res.status(404).json({ success: false, error: '举报不存在' });
  }

  const report = rowToReport(reportRow);

  try {
    await dbOps.run('BEGIN TRANSACTION');

    if (action === 'freeze') {
      let targetUserIds: number[] = [];

      if (reportRow.target_type === 'user') {
        targetUserIds = [reportRow.target_id];
      } else if (reportRow.target_type === 'post') {
        const postRow = await dbOps.get<{ user_id: number }>('SELECT user_id FROM posts WHERE id = ?', [reportRow.target_id]);
        if (postRow?.user_id) {
          targetUserIds = [postRow.user_id];
        }
      } else if (reportRow.target_type === 'service') {
        const serviceRow = await dbOps.get<{ requester_id: number; provider_id: number }>(
          'SELECT requester_id, provider_id FROM services WHERE id = ?',
          [reportRow.target_id]
        );
        if (serviceRow) {
          targetUserIds = [serviceRow.requester_id, serviceRow.provider_id];
        }
      }

      for (const userId of targetUserIds) {
        await dbOps.run(`
          UPDATE users SET is_frozen = 1, frozen_time_balance = time_balance, time_balance = 0 WHERE id = ?
        `, [userId]);
      }
    }

    await dbOps.run(`
      UPDATE reports
      SET status = ?, admin_note = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [action === 'dismiss' ? 'dismissed' : 'resolved', note || null, id]);

    await dbOps.run('COMMIT');

    res.json({ success: true, message: '处理成功' });
  } catch (error) {
    await dbOps.run('ROLLBACK');
    res.status(500).json({ success: false, error: '处理失败' });
  }
});

export default router;
