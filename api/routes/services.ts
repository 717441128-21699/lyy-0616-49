import express from 'express';
import { dbOps, rowToService, rowToPost, rowToUser, rowToTransaction, rowToReview } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { postId, duration } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, error: '请提供帖子ID' });
  }

  if (!duration || duration <= 0) {
    return res.status(400).json({ success: false, error: '请提供有效的服务时长' });
  }

  const postRow = await dbOps.get('SELECT * FROM posts WHERE id = ?', [postId]);
  if (!postRow) {
    return res.status(404).json({ success: false, error: '帖子不存在' });
  }

  if (postRow.user_id === user.id) {
    return res.status(400).json({ success: false, error: '不能对自己发布的帖子发起服务' });
  }

  const isOffer = postRow.type === 'offer';
  const requesterId = isOffer ? user.id : postRow.user_id;
  const providerId = isOffer ? postRow.user_id : user.id;

  const existingService = await dbOps.get(`
    SELECT id FROM services
    WHERE post_id = ? AND requester_id = ? AND provider_id = ? AND status != 'cancelled'
  `, [postId, requesterId, providerId]);

  if (existingService) {
    return res.status(400).json({ success: false, error: '该服务已存在' });
  }

  let serviceId: number;
  try {
    await dbOps.run('BEGIN TRANSACTION');

    const result = await dbOps.run(`
      INSERT INTO services (post_id, requester_id, provider_id, duration, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [postId, requesterId, providerId, duration]);

    serviceId = result.lastID;

    await dbOps.run('COMMIT');
  } catch (error) {
    await dbOps.run('ROLLBACK');
    return res.status(500).json({ success: false, error: '创建服务失败' });
  }

  const serviceRow = await dbOps.get(`
    SELECT s.*,
      p.title as post_title,
      r.username as requester_username, r.avatar as requester_avatar,
      pr.username as provider_username, pr.avatar as provider_avatar
    FROM services s
    LEFT JOIN posts p ON s.post_id = p.id
    LEFT JOIN users r ON s.requester_id = r.id
    LEFT JOIN users pr ON s.provider_id = pr.id
    WHERE s.id = ?
  `, [serviceId]);

  const service = rowToService(serviceRow);

  res.json({
    success: true,
    data: {
      ...service,
      post: {
        id: serviceRow.post_id,
        title: serviceRow.post_title,
      },
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
    },
  });
});

router.post('/get-or-create', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { postId, duration } = req.body;

  if (!postId) {
    return res.status(400).json({ success: false, error: '请提供帖子ID' });
  }

  const postRow = await dbOps.get('SELECT * FROM posts WHERE id = ?', [postId]);
  if (!postRow) {
    return res.status(404).json({ success: false, error: '帖子不存在' });
  }

  if (postRow.user_id === user.id) {
    return res.status(400).json({ success: false, error: '不能对自己发布的帖子发起服务' });
  }

  const isOffer = postRow.type === 'offer';
  const requesterId = isOffer ? user.id : postRow.user_id;
  const providerId = isOffer ? postRow.user_id : user.id;

  let existingService = await dbOps.get(`
    SELECT s.*,
      p.title as post_title,
      r.username as requester_username, r.avatar as requester_avatar,
      pr.username as provider_username, pr.avatar as provider_avatar
    FROM services s
    LEFT JOIN posts p ON s.post_id = p.id
    LEFT JOIN users r ON s.requester_id = r.id
    LEFT JOIN users pr ON s.provider_id = pr.id
    WHERE s.post_id = ? AND s.requester_id = ? AND s.provider_id = ? AND s.status != 'cancelled'
    ORDER BY s.id DESC
    LIMIT 1
  `, [postId, requesterId, providerId]);

  if (existingService) {
    const service = rowToService(existingService);
    return res.json({
      success: true,
      data: {
        ...service,
        post: {
          id: existingService.post_id,
          title: existingService.post_title,
        },
        requester: {
          id: existingService.requester_id,
          username: existingService.requester_username,
          avatar: existingService.requester_avatar,
        },
        provider: {
          id: existingService.provider_id,
          username: existingService.provider_username,
          avatar: existingService.provider_avatar,
        },
      },
    });
  }

  const serviceDuration = duration || postRow.duration;

  let serviceId: number;
  try {
    await dbOps.run('BEGIN TRANSACTION');

    const result = await dbOps.run(`
      INSERT INTO services (post_id, requester_id, provider_id, duration, status)
      VALUES (?, ?, ?, ?, 'pending')
    `, [postId, requesterId, providerId, serviceDuration]);

    serviceId = result.lastID;

    await dbOps.run('COMMIT');
  } catch (error) {
    await dbOps.run('ROLLBACK');
    return res.status(500).json({ success: false, error: '创建服务失败' });
  }

  const serviceRow = await dbOps.get(`
    SELECT s.*,
      p.title as post_title,
      r.username as requester_username, r.avatar as requester_avatar,
      pr.username as provider_username, pr.avatar as provider_avatar
    FROM services s
    LEFT JOIN posts p ON s.post_id = p.id
    LEFT JOIN users r ON s.requester_id = r.id
    LEFT JOIN users pr ON s.provider_id = pr.id
    WHERE s.id = ?
  `, [serviceId]);

  const service = rowToService(serviceRow);

  res.json({
    success: true,
    data: {
      ...service,
      post: {
        id: serviceRow.post_id,
        title: serviceRow.post_title,
      },
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
    },
  });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;

  const row = await dbOps.get(`
    SELECT s.*,
      p.title as post_title, p.description as post_description, p.category as post_category,
      r.username as requester_username, r.avatar as requester_avatar,
      pr.username as provider_username, pr.avatar as provider_avatar
    FROM services s
    LEFT JOIN posts p ON s.post_id = p.id
    LEFT JOIN users r ON s.requester_id = r.id
    LEFT JOIN users pr ON s.provider_id = pr.id
    WHERE s.id = ?
  `, [id]);

  if (!row) {
    return res.status(404).json({ success: false, error: '服务不存在' });
  }

  if (row.requester_id !== user.id && row.provider_id !== user.id && !user.isAdmin) {
    return res.status(403).json({ success: false, error: '无权查看该服务' });
  }

  const service = rowToService(row);
  const reviews = await dbOps.all(`
    SELECT rv.*, u.username, u.avatar
    FROM reviews rv
    LEFT JOIN users u ON rv.reviewer_id = u.id
    WHERE rv.service_id = ?
  `, [id]);

  const myReview = reviews.find((r: any) => r.reviewer_id === user.id);
  const otherReview = reviews.find((r: any) => r.reviewer_id !== user.id);

  res.json({
    success: true,
    data: {
      ...service,
      post: {
        id: row.post_id,
        title: row.post_title,
        description: row.post_description,
        category: row.post_category,
      },
      requester: {
        id: row.requester_id,
        username: row.requester_username,
        avatar: row.requester_avatar,
      },
      provider: {
        id: row.provider_id,
        username: row.provider_username,
        avatar: row.provider_avatar,
      },
      reviews: reviews.map((r: any) => ({
        ...rowToReview(r),
        reviewer: {
          id: r.reviewer_id,
          username: r.username,
          avatar: r.avatar,
        },
      })),
      myConfirmed: !!myReview,
      otherConfirmed: !!otherReview,
      myReview: myReview ? {
        ...rowToReview(myReview),
        reviewer: {
          id: myReview.reviewer_id,
          username: myReview.username,
          avatar: myReview.avatar,
        },
      } : null,
    },
  });
});

router.post('/:id/confirm', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const { rating, review } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: '请提供有效的评分(1-5)' });
  }

  const serviceRow = await dbOps.get('SELECT * FROM services WHERE id = ?', [id]);
  if (!serviceRow) {
    return res.status(404).json({ success: false, error: '服务不存在' });
  }

  const isRequester = serviceRow.requester_id === user.id;
  const isProvider = serviceRow.provider_id === user.id;

  if (!isRequester && !isProvider) {
    return res.status(403).json({ success: false, error: '无权确认该服务' });
  }

  const otherUserId = isRequester ? serviceRow.provider_id : serviceRow.requester_id;
  const duration = serviceRow.duration;

  const myReview = await dbOps.get(`
    SELECT id FROM reviews WHERE service_id = ? AND reviewer_id = ?
  `, [id, user.id]);

  if (myReview) {
    return res.status(400).json({ success: false, error: '您已确认过此服务' });
  }

  if (serviceRow.status === 'completed') {
    return res.status(400).json({ success: false, error: '服务已完成' });
  }

  const otherReview = await dbOps.get(`
    SELECT id FROM reviews WHERE service_id = ? AND reviewer_id = ?
  `, [id, otherUserId]);

  const isFirstConfirm = !otherReview;

  if (isRequester) {
    if (user.timeBalance < duration) {
      return res.status(400).json({
        success: false,
        error: `时间积分不足，您需要支付 ${duration} 小时，但当前余额只有 ${user.timeBalance} 小时`,
        errorCode: 'INSUFFICIENT_BALANCE',
      });
    }
  } else {
    const requesterRow = await dbOps.get('SELECT time_balance FROM users WHERE id = ?', [serviceRow.requester_id]);
    if (!requesterRow || requesterRow.time_balance < duration) {
      return res.status(400).json({
        success: false,
        error: `求助方时间积分不足（${requesterRow?.time_balance || 0}小时），无法完成结算，请先联系对方确认余额`,
        errorCode: 'OTHER_INSUFFICIENT_BALANCE',
      });
    }
  }

  if (isFirstConfirm) {
    await dbOps.run(`
      INSERT INTO reviews (service_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user.id, otherUserId, rating, review || null]);

    await dbOps.run(`
      UPDATE services SET status = 'confirmed' WHERE id = ?
    `, [id]);

    return res.json({
      success: true,
      data: {
        status: 'waiting',
        message: '您已确认，等待对方确认后完成服务',
        myConfirmed: true,
        otherConfirmed: false,
      },
    });
  } else {
    try {
      await dbOps.run('BEGIN TRANSACTION');

      await dbOps.run(`
        INSERT INTO reviews (service_id, reviewer_id, reviewee_id, rating, comment)
        VALUES (?, ?, ?, ?, ?)
      `, [id, user.id, otherUserId, rating, review || null]);

      await dbOps.run(`
        UPDATE services SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `, [id]);

      const fromUserId = serviceRow.requester_id;
      const toUserId = serviceRow.provider_id;

      await dbOps.run(`
        UPDATE users SET time_balance = time_balance - ? WHERE id = ?
      `, [duration, fromUserId]);

      await dbOps.run(`
        UPDATE users SET time_balance = time_balance + ? WHERE id = ?
      `, [duration, toUserId]);

      const txResult = await dbOps.run(`
        INSERT INTO transactions (service_id, from_user_id, to_user_id, amount, type, description)
        VALUES (?, ?, ?, ?, 'service', ?)
      `, [id, fromUserId, toUserId, duration, `服务时长 ${duration} 小时`]);

      await dbOps.run(`
        UPDATE posts SET status = 'completed' WHERE id = ?
      `, [serviceRow.post_id]);

      await dbOps.run('COMMIT');

      const transactionId = txResult.lastID;

      const transactionRow = await dbOps.get(`
        SELECT t.*,
          fu.username as from_username, fu.avatar as from_avatar,
          tu.username as to_username, tu.avatar as to_avatar
        FROM transactions t
        LEFT JOIN users fu ON t.from_user_id = fu.id
        LEFT JOIN users tu ON t.to_user_id = tu.id
        WHERE t.id = ?
      `, [transactionId]);

      const transaction = rowToTransaction(transactionRow);

      return res.json({
        success: true,
        data: {
          ...transaction,
          fromUser: {
            id: transactionRow.from_user_id,
            username: transactionRow.from_username,
            avatar: transactionRow.from_avatar,
          },
          toUser: {
            id: transactionRow.to_user_id,
            username: transactionRow.to_username,
            avatar: transactionRow.to_avatar,
          },
          status: 'completed',
          message: '服务已完成，时间积分已划转',
          myConfirmed: true,
          otherConfirmed: true,
        },
      });
    } catch (error) {
      await dbOps.run('ROLLBACK');
      console.error('确认服务失败:', error);
      return res.status(500).json({ success: false, error: '确认服务失败，请稍后重试' });
    }
  }
});

export default router;
