import { PromptAnswer } from '../database/models/PromptAnswer';
import { Prompt } from '../database/models/Prompt';
import mongoose from 'mongoose';

export interface IPromptAnswerData {
  promptId: string;
  userId: string;
  ocId?: string;
  response: string;
  guildId: string;
}

export async function createPromptAnswer(data: IPromptAnswerData) {
  // Find Prompt by ID (support both ObjectId and custom ID)
  let prompt;
  if (mongoose.Types.ObjectId.isValid(data.promptId)) {
    prompt = await Prompt.findById(data.promptId);
  } else {
    prompt = await Prompt.findOne({ id: data.promptId });
  }
  
  if (!prompt || prompt.guildId !== data.guildId) {
    throw new Error('Prompt not found');
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

  const answer = new PromptAnswer({
    promptId: prompt._id,
    userId: data.userId,
    ocId: ocObjectId,
    response: data.response.trim(),
    guildId: data.guildId
  });

  await answer.save();
  await answer.populate('promptId ocId');
  return answer;
}

export async function getPromptAnswers(guildId: string, promptId?: string, userId?: string, ocId?: string) {
  const query: any = { guildId };
  
  if (promptId) {
    let prompt;
    if (mongoose.Types.ObjectId.isValid(promptId)) {
      prompt = await Prompt.findById(promptId);
    } else {
      prompt = await Prompt.findOne({ id: promptId });
    }
    if (prompt) {
      query.promptId = prompt._id;
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

  return await PromptAnswer.find(query)
    .populate('promptId')
    .populate('ocId')
    .sort({ createdAt: -1 });
}

export async function getPromptAnswerById(id: string) {
  return await PromptAnswer.findById(id)
    .populate('promptId')
    .populate('ocId');
}

export async function updatePromptAnswer(id: string, userId: string, data: { response?: string; ocId?: string }) {
  const answer = await PromptAnswer.findById(id);
  
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
  await answer.populate('promptId ocId');
  return answer;
}

export async function deletePromptAnswer(id: string, userId: string) {
  const answer = await PromptAnswer.findById(id);
  
  if (!answer) {
    throw new Error('Answer not found');
  }
  
  if (answer.userId !== userId) {
    throw new Error('Not authorized');
  }
  
  await PromptAnswer.findByIdAndDelete(id);
  return true;
}

