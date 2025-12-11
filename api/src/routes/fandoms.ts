import express, { Request, Response } from 'express';
import { OC } from '../database/models/OC';
import { Fandom } from '../database/models/Fandom';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

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
      // Handle both old structure (fandom) and new structure (fandoms)
      let fandoms: string[] = [];
      if (oc.fandoms && Array.isArray(oc.fandoms) && oc.fandoms.length > 0) {
        fandoms = oc.fandoms;
      } else if ((oc as any).fandom && typeof (oc as any).fandom === 'string') {
        // Backward compatibility: migrate old fandom field
        fandoms = [(oc as any).fandom];
      }
      
      for (const fandom of fandoms) {
        if (fandom && fandom.trim()) {
          const trimmedFandom = fandom.trim();
          if (!fandomCounts.has(trimmedFandom)) {
            fandomCounts.set(trimmedFandom, { count: 0, users: new Set() });
          }
          const data = fandomCounts.get(trimmedFandom)!;
          data.count++;
          data.users.add(oc.ownerId);
        }
      }
    }

    // Fetch stored fandom metadata from database
    const storedFandoms = await Fandom.find({ guildId });
    const fandomMetadata = new Map<string, { imageUrl?: string }>();
    storedFandoms.forEach((fandom) => {
      fandomMetadata.set(fandom.name, { imageUrl: fandom.imageUrl });
    });

    // Merge computed stats with stored metadata
    const fandoms = Array.from(fandomCounts.entries()).map(([fandom, data]) => {
      const metadata = fandomMetadata.get(fandom) || {};
      return {
        fandom,
        ocCount: data.count,
        userCount: data.users.size,
        imageUrl: metadata.imageUrl
      };
    });

    res.json(fandoms);
  } catch (error: any) {
    console.error('Error fetching fandoms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin route to update fandom image
router.put('/:fandomName', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { fandomName } = req.params;
    // Decode the fandom name to handle special characters
    const decodedFandomName = decodeURIComponent(fandomName);
    const { guildId, imageUrl } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    if (!decodedFandomName) {
      return res.status(400).json({ error: 'fandomName is required' });
    }

    // Find or create the fandom
    const fandom = await Fandom.findOneAndUpdate(
      { name: decodedFandomName, guildId },
      { 
        name: decodedFandomName,
        guildId,
        imageUrl: imageUrl || undefined
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, fandom });
  } catch (error: any) {
    console.error('Error updating fandom:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

