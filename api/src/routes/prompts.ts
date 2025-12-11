import express, { Request, Response } from 'express';
import { Prompt } from '../database/models/Prompt';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { guildId, category, fandom } = req.query;
    const query: any = { guildId };
    if (category) query.category = category;
    if (fandom) query.fandom = fandom;
    const prompts = await Prompt.find(query);
    res.json(prompts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const prompt = new Prompt({
      ...req.body,
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
    const prompt = await Prompt.findById(req.params.id);
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
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.createdById !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Prompt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prompt deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

