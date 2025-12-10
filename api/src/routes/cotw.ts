import express, { Request, Response } from 'express';
import { COTWHistory } from '../database/models/COTWHistory';
import { OC } from '../database/models/OC';
import { ServerConfig } from '../database/models/ServerConfig';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';

const router = express.Router();

router.get('/current', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const cotw = await COTWHistory.findOne({
      guildId,
      date: { $gte: weekStart }
    }).sort({ date: -1 }).populate('ocId');

    res.json(cotw);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, limit } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const history = await COTWHistory.find({ guildId })
      .sort({ date: -1 })
      .limit(parseInt(limit as string) || 20)
      .populate('ocId');

    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reroll COTW (admin only)
router.post('/reroll', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.body;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const config = await ServerConfig.findOne({ guildId });
    if (!config || !config.features.cotw || !config.channels.cotw) {
      return res.status(400).json({ error: 'COTW is not configured for this server' });
    }

    // Get all OCs
    const ocs = await OC.find({ guildId });
    if (ocs.length === 0) {
      return res.status(400).json({ error: 'No OCs found in this server' });
    }

    // Get recently spotlighted (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentHistory = await COTWHistory.find({
      guildId,
      date: { $gte: fourWeeksAgo }
    }).sort({ date: -1 });

    const recentOCIds = recentHistory.map(cotw => cotw.ocId.toString());

    const availableOCs = ocs.filter(oc => !recentOCIds.includes(oc._id.toString()));
    const pool = availableOCs.length > 0 ? availableOCs : ocs;

    // Select random OC
    const randomOC = pool[Math.floor(Math.random() * pool.length)];

    // Create COTW entry
    const cotw = new COTWHistory({
      guildId,
      ocId: randomOC._id,
      channelId: config.channels.cotw,
      date: new Date()
    });
    await cotw.save();

    const populatedCOTW = await COTWHistory.findById(cotw._id).populate('ocId');

    res.json(populatedCOTW);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

