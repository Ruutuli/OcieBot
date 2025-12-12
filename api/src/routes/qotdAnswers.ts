import express, { Request, Response } from 'express';
import { QOTDAnswer } from '../database/models/QOTDAnswer';
import { QOTD } from '../database/models/QOTD';
import { AuthRequest, authenticateToken } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Create answer
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { qotdId, response, ocId } = req.body;
    const guildId = req.body.guildId;

    if (!qotdId || !response || !guildId) {
      return res.status(400).json({ error: 'qotdId, response, and guildId are required' });
    }

    // Verify QOTD exists
    let qotd;
    if (mongoose.Types.ObjectId.isValid(qotdId)) {
      qotd = await QOTD.findById(qotdId);
    } else {
      qotd = await QOTD.findOne({ id: qotdId });
    }
    
    if (!qotd || qotd.guildId !== guildId) {
      return res.status(404).json({ error: 'QOTD not found' });
    }

    const qotdObjectId = qotd._id;

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

    const answer = new QOTDAnswer({
      qotdId: qotdObjectId,
      userId: authReq.user!.id,
      ocId: ocObjectId,
      response: response.trim(),
      guildId
    });

    await answer.save();
    await answer.populate('qotdId ocId');
    res.status(201).json(answer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get answers with filters
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { guildId, qotdId, userId, ocId } = req.query;
    
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const query: any = { guildId };
    
    if (qotdId) {
      // Support both ObjectId and custom ID
      let qotd;
      if (mongoose.Types.ObjectId.isValid(qotdId as string)) {
        qotd = await QOTD.findById(qotdId);
      } else {
        qotd = await QOTD.findOne({ id: qotdId });
      }
      if (qotd) {
        query.qotdId = qotd._id;
      } else {
        return res.json([]); // Return empty if QOTD not found
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

    const answers = await QOTDAnswer.find(query)
      .populate('qotdId')
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
    const answer = await QOTDAnswer.findById(req.params.id)
      .populate('qotdId')
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
    const answer = await QOTDAnswer.findById(req.params.id);
    
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
    await answer.populate('qotdId ocId');
    res.json(answer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Delete answer (owner only)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const answer = await QOTDAnswer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ error: 'Answer not found' });
    }
    
    if (answer.userId !== authReq.user!.id) {
      return res.status(403).json({ error: 'Not authorized. You can only delete your own answers.' });
    }
    
    await QOTDAnswer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Answer deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

