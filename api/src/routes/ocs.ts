import express, { Request, Response } from 'express';
import { OC } from '../database/models/OC';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';
import mongoose from 'mongoose';

const router = express.Router();

// Get all OCs for a guild
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const ocs = await OC.find({ guildId }).populate('triviaQuestions');
    res.json(ocs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific OC
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let oc = null;
    // Try custom ID format first (O12345)
    if (isValidCustomId(req.params.id)) {
      oc = await OC.findOne({ id: req.params.id }).populate('triviaQuestions');
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      oc = await OC.findById(req.params.id).populate('triviaQuestions');
    }
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }
    res.json(oc);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create OC
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const id = await generateCustomId('O', OC);
    const oc = new OC({
      ...req.body,
      id,
      ownerId: authReq.user!.id
    });
    await oc.save();
    res.status(201).json(oc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update OC
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let oc = null;
    // Try custom ID format first (O12345)
    if (isValidCustomId(req.params.id)) {
      oc = await OC.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      oc = await OC.findById(req.params.id);
    }
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }

    // Check ownership or admin
    if (oc.ownerId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    Object.assign(oc, req.body);
    await oc.save();
    res.json(oc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete OC
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let oc = null;
    // Try custom ID format first (O12345)
    if (isValidCustomId(req.params.id)) {
      oc = await OC.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      oc = await OC.findById(req.params.id);
    }
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }

    // Check ownership or admin
    if (oc.ownerId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete using the same method we used to find
    if (isValidCustomId(req.params.id)) {
      await OC.findOneAndDelete({ id: req.params.id });
    } else {
      await OC.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'OC deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update OC playlist
router.put('/:id/playlist', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let oc = null;
    // Try custom ID format first (O12345)
    if (isValidCustomId(req.params.id)) {
      oc = await OC.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      oc = await OC.findById(req.params.id);
    }
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }

    // Check ownership
    if (oc.ownerId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { action, songLink } = req.body;
    if (!action || !songLink) {
      return res.status(400).json({ error: 'action and songLink are required' });
    }

    if (action === 'add') {
      if (!oc.playlist.includes(songLink)) {
        oc.playlist.push(songLink);
      }
    } else if (action === 'remove') {
      oc.playlist = oc.playlist.filter(link => link !== songLink);
    } else {
      return res.status(400).json({ error: 'action must be "add" or "remove"' });
    }

    await oc.save();
    res.json(oc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add note to OC
router.put('/:id/notes', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let oc = null;
    // Try custom ID format first (O12345)
    if (isValidCustomId(req.params.id)) {
      oc = await OC.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      oc = await OC.findById(req.params.id);
    }
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }

    // Check ownership
    if (oc.ownerId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { note } = req.body;
    if (!note) {
      return res.status(400).json({ error: 'note is required' });
    }

    oc.notes.push(note);
    await oc.save();
    res.json(oc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

