import express, { Request, Response } from 'express';
import { PromptAnswer } from '../database/models/PromptAnswer';
import { Prompt } from '../database/models/Prompt';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Create answer
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { promptId, response, ocId } = req.body;
    const guildId = req.body.guildId;

    if (!promptId || !response || !guildId) {
      return res.status(400).json({ error: 'promptId, response, and guildId are required' });
    }

    // Verify Prompt exists
    let prompt;
    if (mongoose.Types.ObjectId.isValid(promptId)) {
      prompt = await Prompt.findById(promptId);
    } else {
      prompt = await Prompt.findOne({ id: promptId });
    }
    
    if (!prompt || prompt.guildId !== guildId) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const promptObjectId = prompt._id;

    // Convert ocId to ObjectId if provided and valid
    let ocObjectId: mongoose.Types.ObjectId | undefined;
    if (ocId) {
      if (mongoose.Types.ObjectId.isValid(ocId)) {
        ocObjectId = new mongoose.Types.ObjectId(ocId);
      } else {
        // Try to find OC by custom ID
        const { OC } = await import('../database/models/OC');
        const oc = await OC.findOne({ id: ocId, guildId });
        if (oc) {
          ocObjectId = oc._id;
        }
      }
    }

    const answer = new PromptAnswer({
      promptId: promptObjectId,
      userId: authReq.user!.id,
      ocId: ocObjectId,
      response: response.trim(),
      guildId
    });

    await answer.save();
    await answer.populate('promptId ocId');
    res.status(201).json(answer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get answers with filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { guildId, promptId, userId, ocId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const query: any = { guildId };
    
    if (promptId) {
      // Support both ObjectId and custom ID
      let prompt;
      if (mongoose.Types.ObjectId.isValid(promptId as string)) {
        prompt = await Prompt.findById(promptId);
      } else {
        prompt = await Prompt.findOne({ id: promptId });
      }
      if (prompt) {
        query.promptId = prompt._id;
      } else {
        return res.json([]); // Return empty if Prompt not found
      }
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (ocId) {
      if (mongoose.Types.ObjectId.isValid(ocId as string)) {
        query.ocId = ocId;
      } else {
        // Try to find OC by custom ID
        const { OC } = await import('../database/models/OC');
        const oc = await OC.findOne({ id: ocId, guildId });
        if (oc) {
          query.ocId = oc._id;
        } else {
          return res.json([]); // Return empty if OC not found
        }
      }
    }

    const answers = await PromptAnswer.find(query)
      .populate('promptId')
      .populate('ocId')
      .sort({ createdAt: -1 });
    
    res.json(answers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific answer
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const answer = await PromptAnswer.findById(req.params.id)
      .populate('promptId')
      .populate('ocId');
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    res.json(answer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update answer (owner only)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const answer = await PromptAnswer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    if (answer.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized. You can only edit your own answers.' });
    }
    
    if (req.body.response !== undefined) {
      answer.response = req.body.response.trim();
    }
    
    if (req.body.ocId !== undefined) {
      if (req.body.ocId) {
        let ocObjectId: mongoose.Types.ObjectId | undefined;
        if (mongoose.Types.ObjectId.isValid(req.body.ocId)) {
          ocObjectId = new mongoose.Types.ObjectId(req.body.ocId);
        } else {
          const { OC } = await import('../database/models/OC');
          const oc = await OC.findOne({ id: req.body.ocId, guildId: answer.guildId });
          if (oc) {
            ocObjectId = oc._id;
          }
        }
        answer.ocId = ocObjectId;
      } else {
        answer.ocId = undefined;
      }
    }
    
    await answer.save();
    await answer.populate('promptId ocId');
    res.json(answer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete answer (owner only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const answer = await PromptAnswer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    if (answer.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized. You can only delete your own answers.' });
    }
    
    await PromptAnswer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Answer deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

