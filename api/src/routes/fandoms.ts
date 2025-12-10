import express, { Request, Response } from 'express';
import { OC } from '../database/models/OC';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const ocs = await OC.find({ guildId });
    const fandomCounts = new Map<string, { count: number; users: Set<string> }>();
    
    for (const oc of ocs) {
      const fandom = oc.fandom;
      if (!fandomCounts.has(fandom)) {
        fandomCounts.set(fandom, { count: 0, users: new Set() });
      }
      const data = fandomCounts.get(fandom)!;
      data.count++;
      data.users.add(oc.ownerId);
    }

    const fandoms = Array.from(fandomCounts.entries()).map(([fandom, data]) => ({
      fandom,
      ocCount: data.count,
      userCount: data.users.size
    }));

    res.json(fandoms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

