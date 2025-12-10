import express from 'express';
import { OC } from '../database/models/OC';
import { AuthRequest, authenticateToken } from '../middleware/auth';

const router = express.Router();

router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { guildId, month } = req.query;
    if (!guildId) {
      return res.status(400).json({ error: 'guildId is required' });
    }

    const ocs = await OC.find({ guildId, birthday: { $exists: true, $ne: null } });
    
    if (month) {
      const monthStr = String(month).padStart(2, '0');
      const filtered = ocs.filter(oc => oc.birthday?.startsWith(monthStr));
      return res.json(filtered);
    }

    res.json(ocs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Set or clear OC birthday
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const oc = await OC.findById(req.params.id);
    if (!oc) {
      return res.status(404).json({ error: 'OC not found' });
    }

    // Check ownership
    if (oc.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { birthday } = req.body;

    if (birthday === null || birthday === undefined || birthday === '') {
      // Clear birthday
      oc.birthday = undefined;
    } else {
      // Validate birthday format (MM-DD)
      if (!/^\d{2}-\d{2}$/.test(birthday)) {
        return res.status(400).json({ error: 'Birthday must be in MM-DD format (e.g., 03-15)' });
      }
      oc.birthday = birthday;
    }

    await oc.save();
    res.json(oc);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

