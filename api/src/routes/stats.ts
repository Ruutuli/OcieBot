import express, { Request, Response } from 'express';
import { OC } from '../database/models/OC';
import { QOTD } from '../database/models/QOTD';
import { Prompt } from '../database/models/Prompt';
import { Trivia } from '../database/models/Trivia';
import { COTWHistory } from '../database/models/COTWHistory';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { startOfMonth } from 'date-fns';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const [ocs, qotds, prompts, trivias, cotwHistory] = await Promise.all([
      OC.find({ guildId }),
      QOTD.find({ guildId }),
      Prompt.find({ guildId }),
      Trivia.find({ guildId }),
      COTWHistory.find({ guildId })
    ]);

    const monthStart = startOfMonth(new Date());
    const newOCsThisMonth = ocs.filter(oc => oc.createdAt >= monthStart).length;

    const fandomCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();
    
    for (const oc of ocs) {
      // Handle fandoms array (multi-fandom support)
      if (oc.fandoms && oc.fandoms.length > 0) {
        for (const fandom of oc.fandoms) {
          fandomCounts.set(fandom, (fandomCounts.get(fandom) || 0) + 1);
        }
      }
      userCounts.set(oc.ownerId, (userCounts.get(oc.ownerId) || 0) + 1);
    }

    const stats = {
      ocs: {
        total: ocs.length,
        withYume: ocs.filter(oc => oc.yume).length,
        withBirthdays: ocs.filter(oc => oc.birthday).length,
        withPlaylists: ocs.filter(oc => oc.playlist && oc.playlist.length > 0).length,
        newThisMonth: newOCsThisMonth
      },
      fandoms: {
        total: fandomCounts.size,
        top5: Array.from(fandomCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([fandom, count]) => ({ fandom, count }))
      },
      users: {
        total: userCounts.size
      },
      content: {
        qotds: qotds.length,
        prompts: prompts.length,
        trivia: trivias.length
      },
      features: {
        cotws: cotwHistory.length
      }
    };

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

