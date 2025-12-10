import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { Admin } from '../database/models/Admin';

// Keep the original admin ID as a fallback for initial setup
const ORIGINAL_ADMIN_USER_ID = '211219306137124865';

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest;
  
  if (!authReq.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userId = authReq.user.id;
  
  // Check if user is the original admin (for initial setup)
  if (userId === ORIGINAL_ADMIN_USER_ID) {
    // Ensure original admin is in database
    const existingAdmin = await Admin.findOne({ userId });
    if (!existingAdmin) {
      await Admin.create({ userId, addedBy: userId });
    }
    return next();
  }

  // Check if user is in admin database
  const admin = await Admin.findOne({ userId });
  if (!admin) {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  
  next();
}

// Helper function to check if a user is an admin (non-blocking, for UI checks)
export async function isAdmin(userId: string): Promise<boolean> {
  if (userId === ORIGINAL_ADMIN_USER_ID) {
    return true;
  }
  const admin = await Admin.findOne({ userId });
  return !!admin;
}

