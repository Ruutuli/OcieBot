import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

const ADMIN_USER_ID = '211219306137124865';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  
  if (!authReq.user || authReq.user.id !== ADMIN_USER_ID) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  
  next();
}

