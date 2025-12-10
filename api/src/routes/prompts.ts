import express from 'express';
import { Prompt } from '../database/models/Prompt';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
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

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const prompt = new Prompt({
      ...req.body,
      createdById: req.user!.id
    });
    await prompt.save();
    res.status(201).json(prompt);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Prompt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Prompt deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

