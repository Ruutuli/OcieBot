import express, { Request, Response } from 'express';
import { Trivia } from '../database/models/Trivia';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import { generateCustomId, isValidCustomId } from '../utils/idGenerator';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, createdById, ownerId, fandom } = req.query;
    const query: any = { guildId };
    if (createdById) query.createdById = createdById;
    
    let trivias = await Trivia.find(query).populate('ocId');
    
    // Filter by OC owner if specified
    if (ownerId) {
      trivias = trivias.filter((trivia: any) => {
        const oc = trivia.ocId;
        return oc && oc.ownerId === ownerId;
      });
    }
    
    // Filter by fandom if specified
    if (fandom) {
      trivias = trivias.filter((trivia: any) => {
        const oc = trivia.ocId;
        return oc && oc.fandoms && oc.fandoms.includes(fandom);
      });
    }
    
    res.json(trivias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const id = await generateCustomId('T', Trivia);
    const trivia = new Trivia({
      ...req.body,
      id,
      createdById: authReq.user!.id
    });
    await trivia.save();
    await trivia.populate('ocId');
    res.status(201).json(trivia);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let trivia = null;
    // Try custom ID format first (T12345)
    if (isValidCustomId(req.params.id)) {
      trivia = await Trivia.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      trivia = await Trivia.findById(req.params.id);
    }
    if (!trivia) {
      return res.status(404).json({ error: 'Trivia not found' });
    }
    if (trivia.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { question, ocId } = req.body;
    if (question !== undefined) trivia.question = question;
    if (ocId !== undefined) trivia.ocId = ocId;
    await trivia.save();
    await trivia.populate('ocId');
    res.json(trivia);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let trivia = null;
    // Try custom ID format first (T12345)
    if (isValidCustomId(req.params.id)) {
      trivia = await Trivia.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      trivia = await Trivia.findById(req.params.id);
    }
    if (!trivia) {
      return res.status(404).json({ error: 'Trivia not found' });
    }
    if (trivia.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Delete using the same method we used to find
    if (isValidCustomId(req.params.id)) {
      await Trivia.findOneAndDelete({ id: req.params.id });
    } else {
      await Trivia.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Trivia deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

