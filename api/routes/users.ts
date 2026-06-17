import express from 'express';
import { dbOps, rowToUser, rowToPost, rowToReview } from '../db/index.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const userRow = await dbOps.get('SELECT * FROM users WHERE id = ?', [id]);
  if (!userRow) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  const user = rowToUser(userRow);

  const completedServices = await dbOps.get<{ count: number }>(`
    SELECT COUNT(*) as count FROM services
    WHERE (provider_id = ? OR requester_id = ?) AND status = 'completed'
  `, [id, id]);

  const avgRatingRow = await dbOps.get<{ avg_rating: number | null }>(`
    SELECT AVG(rating) as avg_rating FROM reviews
    WHERE reviewee_id = ?
  `, [id]);

  res.json({
    success: true,
    data: {
      id: user!.id,
      username: user!.username,
      avatar: user!.avatar,
      creditScore: user!.creditScore,
      completedServices: completedServices!.count,
      avgRating: avgRatingRow!.avg_rating ? Math.round(avgRatingRow!.avg_rating * 10) / 10 : null,
      joinDate: user!.createdAt,
    },
  });
});

router.get('/:id/posts', async (req, res) => {
  const { id } = req.params;
  const { type, status } = req.query;

  let whereClause = 'WHERE user_id = ?';
  const params: any[] = [id];

  if (type) {
    whereClause += ' AND type = ?';
    params.push(type);
  }

  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const rows = await dbOps.all(`
    SELECT * FROM posts
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 20
  `, params);

  const posts = rows.map((row: any) => rowToPost(row));

  res.json({ success: true, data: posts });
});

router.get('/:id/reviews', async (req, res) => {
  const { id } = req.params;
  const { type = 'received' } = req.query;

  const userId = parseInt(id as string, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, error: '无效的用户ID' });
  }

  const isReceived = type === 'received';
  const whereColumn = isReceived ? 'reviewee_id' : 'reviewer_id';
  const joinColumn = isReceived ? 'reviewer_id' : 'reviewee_id';

  const rows = await dbOps.all(`
    SELECT rv.*,
      p.title as post_title, s.post_id,
      u.username as other_username, u.avatar as other_avatar
    FROM reviews rv
    LEFT JOIN services s ON rv.service_id = s.id
    LEFT JOIN posts p ON s.post_id = p.id
    LEFT JOIN users u ON rv.${joinColumn} = u.id
    WHERE rv.${whereColumn} = ?
    ORDER BY rv.created_at DESC
    LIMIT 50
  `, [userId]);

  const reviews = rows.map((row: any) => {
    const review = rowToReview(row);
    return {
      ...review,
      post: {
        id: row.post_id,
        title: row.post_title,
      },
      otherUser: {
        id: row[isReceived ? 'reviewer_id' : 'reviewee_id'],
        username: row.other_username,
        avatar: row.other_avatar,
      },
    };
  });

  res.json({ success: true, data: reviews });
});

export default router;
