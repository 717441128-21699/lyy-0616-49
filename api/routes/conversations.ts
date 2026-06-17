import express from 'express';
import { dbOps, rowToConversation, rowToMessage, rowToUser } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user;

  const sql = `
    SELECT c.*,
      p.title as post_title,
      m.content as last_message, m.created_at as last_message_time, m.sender_id as last_message_sender,
      u.username as other_username, u.avatar as other_avatar,
      SUM(CASE WHEN m.is_read = 0 AND m.sender_id != ? THEN 1 ELSE 0 END) as unread_count
    FROM conversations c
    INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != cp.user_id
    LEFT JOIN users u ON cp2.user_id = u.id
    LEFT JOIN posts p ON c.post_id = p.id
    LEFT JOIN messages m ON (
      SELECT MAX(id) FROM messages WHERE conversation_id = c.id
    ) = m.id
    WHERE cp.user_id = ?
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `;

  const rows = await dbOps.all(sql, [user.id, user.id]);

  const list = rows.map((row: any) => {
    const conversation = rowToConversation(row);
    return {
      ...conversation,
      otherUser: {
        id: row.other_user_id,
        username: row.other_username,
        avatar: row.other_avatar,
      },
      postTitle: row.post_title,
      lastMessage: row.last_message ? {
        content: row.last_message,
        createdAt: row.last_message_time,
        senderId: row.last_message_sender,
      } : undefined,
      unreadCount: row.unread_count || 0,
    };
  });

  res.json({ success: true, data: list });
});

router.get('/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;

  const participant = await dbOps.get(`
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
  `, [id, user.id]);

  if (!participant) {
    return res.status(403).json({ success: false, error: '无权访问此会话' });
  }

  await dbOps.run(`
    UPDATE messages SET is_read = 1
    WHERE conversation_id = ? AND sender_id != ?
  `, [id, user.id]);

  const rows = await dbOps.all(`
    SELECT m.*, u.username, u.avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
    LIMIT 100
  `, [id]);

  const messages = rows.map((row: any) => ({
    ...rowToMessage(row),
    sender: {
      id: row.sender_id,
      username: row.username,
      avatar: row.avatar,
    },
  }));

  res.json({ success: true, data: messages });
});

router.post('/:id/messages', requireAuth, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const { content, type = 'text' } = req.body;

  if (!content) {
    return res.status(400).json({ success: false, error: '消息内容不能为空' });
  }

  const participant = await dbOps.get(`
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
  `, [id, user.id]);

  if (!participant) {
    return res.status(403).json({ success: false, error: '无权访问此会话' });
  }

  let messageId: number;
  try {
    await dbOps.run('BEGIN');
    
    const result = await dbOps.run(`
      INSERT INTO messages (conversation_id, sender_id, content, type)
      VALUES (?, ?, ?, ?)
    `, [id, user.id, content, type]);

    messageId = result.lastID;

    await dbOps.run(`
      UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [id]);

    await dbOps.run('COMMIT');
  } catch (error) {
    await dbOps.run('ROLLBACK');
    throw error;
  }

  const messageRow = await dbOps.get(`
    SELECT m.*, u.username, u.avatar
    FROM messages m
    LEFT JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `, [messageId]);

  const message = rowToMessage(messageRow);

  res.json({
    success: true,
    data: {
      ...message,
      sender: {
        id: messageRow!.sender_id,
        username: messageRow!.username,
        avatar: messageRow!.avatar,
      },
    },
  });
});

router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { participantId, postId } = req.body;

  if (!participantId) {
    return res.status(400).json({ success: false, error: '请选择对话对象' });
  }

  if (participantId === user.id) {
    return res.status(400).json({ success: false, error: '不能与自己发起对话' });
  }

  const otherUser = await dbOps.get('SELECT id FROM users WHERE id = ?', [participantId]);
  if (!otherUser) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  let existingConvo;
  if (postId) {
    existingConvo = await dbOps.get(`
      SELECT c.id FROM conversations c
      INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.post_id = ? AND cp1.user_id = ? AND cp2.user_id = ?
    `, [postId, user.id, participantId]);
  }

  if (existingConvo) {
    return res.json({
      success: true,
      data: { id: existingConvo.id, isNew: false },
    });
  }

  let conversationId: number;
  try {
    await dbOps.run('BEGIN');
    
    const result = await dbOps.run(`
      INSERT INTO conversations (post_id)
      VALUES (?)
    `, [postId || null]);

    conversationId = result.lastID;

    await dbOps.run(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (?, ?)
    `, [conversationId, user.id]);

    await dbOps.run(`
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (?, ?)
    `, [conversationId, participantId]);

    await dbOps.run('COMMIT');
  } catch (error) {
    await dbOps.run('ROLLBACK');
    throw error;
  }

  res.json({
    success: true,
    data: { id: conversationId, isNew: true },
  });
});

export default router;
