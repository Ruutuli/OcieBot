import express from 'express';
import { Trivia } from '../database/models/Trivia';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { guildId } = req.query;
    const query: any = { guildId };
    const trivias = await Trivia.find(query).populate('ocId');
    res.json(trivias);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const trivia = new Trivia({
      ...req.body,
      createdById: req.user!.id
    });
    await trivia.save();
    await trivia.populate('ocId');
    res.status(201).json(trivia);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const trivia = await Trivia.findById(req.params.id);
    if (!trivia) {
      return res.status(404).json({ error: 'Trivia not found' });
    }
    if (trivia.createdById !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Trivia.findByIdAndDelete(req.params.id);
    res.json({ message: 'Trivia deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

