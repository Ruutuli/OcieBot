import express, { Request, Response } from 'express';
import { QOTD } from '../database/models/QOTD';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, category, fandom, createdById } = req.query;
    const query: any = { guildId };
    if (category) query.category = category;
    if (fandom) query.fandom = fandom;
    if (createdById) query.createdById = createdById;
    const qotds = await QOTD.find(query);
    res.json(qotds);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const id = await generateCustomId('Q', QOTD);
    const qotd = new QOTD({
      ...req.body,
      id,
      createdById: authReq.user!.id
    });
    await qotd.save();
    res.status(201).json(qotd);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let qotd = null;
    // Try custom ID format first (Q12345)
    if (isValidCustomId(req.params.id)) {
      qotd = await QOTD.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      qotd = await QOTD.findById(req.params.id);
    }
    if (!qotd) {
      return res.status(404).json({ error: 'QOTD not found' });
    }
    if (qotd.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { question, category, fandom } = req.body;
    if (question !== undefined) qotd.question = question;
    if (category !== undefined) qotd.category = category;
    if (fandom !== undefined) qotd.fandom = fandom;
    await qotd.save();
    res.json(qotd);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let qotd = null;
    // Try custom ID format first (Q12345)
    if (isValidCustomId(req.params.id)) {
      qotd = await QOTD.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      qotd = await QOTD.findById(req.params.id);
    }
    if (!qotd) {
      return res.status(404).json({ error: 'QOTD not found' });
    }
    if (qotd.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Delete using the same method we used to find
    if (isValidCustomId(req.params.id)) {
      await QOTD.findOneAndDelete({ id: req.params.id });
    } else {
      await QOTD.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'QOTD deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

