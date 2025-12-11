import express, { Request, Response } from 'express';
import { Prompt } from '../database/models/Prompt';
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
    const prompts = await Prompt.find(query);
    res.json(prompts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const id = await generateCustomId('P', Prompt);
    const prompt = new Prompt({
      ...req.body,
      id,
      createdById: authReq.user!.id
    });
    await prompt.save();
    res.status(201).json(prompt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let prompt = null;
    // Try custom ID format first (P12345)
    if (isValidCustomId(req.params.id)) {
      prompt = await Prompt.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      prompt = await Prompt.findById(req.params.id);
    }
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized. You can only edit your own prompts.' });
    }
    
    // Update only allowed fields (don't allow changing createdById)
    prompt.text = req.body.text || prompt.text;
    prompt.category = req.body.category || prompt.category;
    prompt.fandom = req.body.fandom !== undefined ? req.body.fandom : prompt.fandom;
    
    await prompt.save();
    res.json(prompt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    let prompt = null;
    // Try custom ID format first (P12345)
    if (isValidCustomId(req.params.id)) {
      prompt = await Prompt.findOne({ id: req.params.id });
    } else if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      // Fallback to MongoDB ObjectId for backward compatibility
      prompt = await Prompt.findById(req.params.id);
    }
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Delete using the same method we used to find
    if (isValidCustomId(req.params.id)) {
      await Prompt.findOneAndDelete({ id: req.params.id });
    } else {
      await Prompt.findByIdAndDelete(req.params.id);
    }
    res.json({ message: 'Prompt deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

