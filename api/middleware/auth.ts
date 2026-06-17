import { Request, Response, NextFunction } from 'express';
import { dbOps, rowToUser } from '../db/index.js';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: '未登录' });
  }

  const userRow = await dbOps.get('SELECT * FROM users WHERE id = ?', [req.session.userId]);
  const user = rowToUser(userRow);

  if (!user || user.isFrozen) {
    return res.status(401).json({ success: false, error: user?.isFrozen ? '账户已被冻结' : '用户不存在' });
  }

  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (!user.isAdmin) {
      return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    next();
  });
}
