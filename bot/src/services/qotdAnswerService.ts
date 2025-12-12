import { QOTDAnswer } from '../database/models/QOTDAnswer';
import { QOTD } from '../database/models/QOTD';
import mongoose from 'mongoose';

export interface IQOTDAnswerData {
  qotdId: string;
  userId: string;
  ocId?: string;
  response: string;
  guildId: string;
}

export async function createQOTDAnswer(data: IQOTDAnswerData) {
  // Find QOTD by ID (support both ObjectId and custom ID)
  let qotd;
  if (mongoose.Types.ObjectId.isValid(data.qotdId)) {
    qotd = await QOTD.findById(data.qotdId);
  } else {
    qotd = await QOTD.findOne({ id: data.qotdId });
  }
  
  if (!qotd || qotd.guildId !== data.guildId) {
    throw new Error('QOTD not found');
  }

  // Convert ocId to ObjectId if provided
  let ocObjectId: mongoose.Types.ObjectId | undefined;
  if (data.ocId) {
    if (mongoose.Types.ObjectId.isValid(data.ocId)) {
      ocObjectId = new mongoose.Types.ObjectId(data.ocId);
    } else {
      // Try to find OC by custom ID
      const { OC } = await import('../database/models/OC');
      const oc = await OC.findOne({ id: data.ocId, guildId: data.guildId });
      if (oc) {
        ocObjectId = oc._id;
      } else {
        throw new Error('OC not found');
      }
    }
  }

  const answer = new QOTDAnswer({
    qotdId: qotd._id,
    userId: data.userId,
    ocId: ocObjectId,
    response: data.response.trim(),
    guildId: data.guildId
  });

  await answer.save();
  await answer.populate('qotdId ocId');
  return answer;
}

export async function getQOTDAnswers(guildId: string, qotdId?: string, userId?: string, ocId?: string) {
  const query: any = { guildId };
  
  if (qotdId) {
    let qotd;
    if (mongoose.Types.ObjectId.isValid(qotdId)) {
      qotd = await QOTD.findById(qotdId);
    } else {
      qotd = await QOTD.findOne({ id: qotdId });
    }
    if (qotd) {
      query.qotdId = qotd._id;
    } else {
      return [];
    }
  }
  
  if (userId) {
    query.userId = userId;
  }
  
  if (ocId) {
    if (mongoose.Types.ObjectId.isValid(ocId)) {
      query.ocId = ocId;
    } else {
      const { OC } = await import('../database/models/OC');
      const oc = await OC.findOne({ id: ocId, guildId });
      if (oc) {
        query.ocId = oc._id;
      } else {
        return [];
      }
    }
  }

  return await QOTDAnswer.find(query)
    .populate('qotdId')
    .populate('ocId')
    .sort({ createdAt: -1 });
}

export async function getQOTDAnswerById(id: string) {
  return await QOTDAnswer.findById(id)
    .populate('qotdId')
    .populate('ocId');
}

export async function updateQOTDAnswer(id: string, userId: string, data: { response?: string; ocId?: string }) {
  const answer = await QOTDAnswer.findById(id);
  
  if (!answer) {
    throw new Error('Answer not found');
  }
  
  if (answer.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  if (data.response !== undefined) {
    answer.response = data.response.trim();
  }
  
  if (data.ocId !== undefined) {
    if (data.ocId) {
      let ocObjectId: mongoose.Types.ObjectId | undefined;
      if (mongoose.Types.ObjectId.isValid(data.ocId)) {
        ocObjectId = new mongoose.Types.ObjectId(data.ocId);
      } else {
        const { OC } = await import('../database/models/OC');
        const oc = await OC.findOne({ id: data.ocId, guildId: answer.guildId });
        if (oc) {
          ocObjectId = oc._id;
        } else {
          throw new Error('OC not found');
        }
      }
      answer.ocId = ocObjectId;
    } else {
      answer.ocId = undefined;
    }
  }
  
  await answer.save();
  await answer.populate('qotdId ocId');
  return answer;
}

export async function deleteQOTDAnswer(id: string, userId: string) {
  const answer = await QOTDAnswer.findById(id);
  
  if (!answer) {
    throw new Error('Answer not found');
  }
  
  if (answer.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  await QOTDAnswer.findByIdAndDelete(id);
  return true;
}

