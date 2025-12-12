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
    const fandomMetadata = new Map<string, { imageUrl?: string; color?: string }>();
    storedFandoms.forEach((fandom) => {
      fandomMetadata.set(fandom.name, { imageUrl: fandom.imageUrl, color: fandom.color });
    });

    // Merge computed stats with stored metadata
    const fandomsMap = new Map<string, { ocCount: number; userCount: number; imageUrl?: string; color?: string }>();
    
    // Add fandoms from OCs
    Array.from(fandomCounts.entries()).forEach(([fandom, data]) => {
      const metadata = fandomMetadata.get(fandom) || {};
      fandomsMap.set(fandom, {
        ocCount: data.count,
        userCount: data.users.size,
        imageUrl: metadata.imageUrl,
        color: metadata.color
      });
    });

    // Add fandoms from database that don't have OCs yet
    storedFandoms.forEach((fandom) => {
      if (!fandomsMap.has(fandom.name)) {
        fandomsMap.set(fandom.name, {
          ocCount: 0,
          userCount: 0,
          imageUrl: fandom.imageUrl,
          color: fandom.color
        });
      }
    });

    const fandoms = Array.from(fandomsMap.entries()).map(([fandom, data]) => ({
      fandom,
      ...data
    }));

    res.json(fandoms);
  } catch (error: any) {
    console.error('Error fetching fandoms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin route to create a new fandom
router.post('/', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, name, imageUrl, color } = req.body;

    if (!guildId || !name) {
      return res.status(400).json({ error: 'guildId and name are required' });
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return res.status(400).json({ error: 'Fandom name cannot be empty' });
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex color code (e.g., #FF5733)' });
    }

    // Check if fandom already exists
    const existing = await Fandom.findOne({ name: trimmedName, guildId });
    if (existing) {
      return res.status(400).json({ error: 'Fandom already exists' });
    }

    // Create the fandom
    const fandom = new Fandom({
      name: trimmedName,
      guildId,
      imageUrl: imageUrl || undefined,
      color: color || undefined
    });

    await fandom.save();

    res.status(201).json({ success: true, fandom });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Fandom already exists' });
    }
    console.error('Error creating fandom:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin route to update fandom image and color
router.put('/:fandomName', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { fandomName } = req.params;
    // Decode the fandom name to handle special characters
    const decodedFandomName = decodeURIComponent(fandomName);
    const { guildId, imageUrl, color } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    if (!decodedFandomName) {
      return res.status(400).json({ error: 'fandomName is required' });
    }

    // Validate color format if provided (should be hex color)
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({ error: 'Color must be a valid hex color code (e.g., #FF5733)' });
    }

    // Find or create the fandom
    const updateData: any = {
      name: decodedFandomName,
      guildId
    };
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl || undefined;
    }
    if (color !== undefined) {
      updateData.color = color || undefined;
    }

    const fandom = await Fandom.findOneAndUpdate(
      { name: decodedFandomName, guildId },
      updateData,
      { upsert: true, new: true }
    );

    res.json({ success: true, fandom });
  } catch (error: any) {
    console.error('Error updating fandom:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

