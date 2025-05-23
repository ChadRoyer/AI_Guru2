import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts, generateAIOpportunitiesPrompt } from '@/lib/prompts';
import { type ChatCompletionMessageParam } from 'openai/resources';

type OpportunitiesResponse = {
  opportunities: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OpportunitiesResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workflowData } = req.body;

    if (!workflowData) {
      return res.status(400).json({ error: 'Workflow data is required' });
    }

    // Generate a prompt based on the workflow data
    const userPrompt = generateAIOpportunitiesPrompt(workflowData);

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompts.aiOpportunities },
      { role: 'user', content: userPrompt }
    ];

    // Call OpenAI with the prompt
    const response = await openai.chat.completions.create({
      model: getOpenAIModel(), // Use the model from environment variables
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return res.status(200).json({ 
      opportunities: response.choices[0].message.content || ''
    });
  } catch (error) {
    console.error('Error identifying opportunities:', error);
    return res.status(500).json({ error: 'Failed to identify opportunities' });
  }
} 