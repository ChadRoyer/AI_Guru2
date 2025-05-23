import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts } from '@/lib/prompts';
import { supabase } from '@/lib/supabaseClient';

type ImplementationGuidanceResponse = {
  guidance: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImplementationGuidanceResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { opportunity, workflow_id } = req.body;

  if (!opportunity) {
    return res.status(400).json({ error: 'Opportunity description is required' });
  }

  try {
    // If workflow_id is provided, fetch the workflow data for additional context
    let workflowContext = '';
    if (workflow_id) {
      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('title, workflow_data')
        .eq('id', workflow_id)
        .single();
        
      if (!error && workflow) {
        workflowContext = `
This opportunity is for the workflow: "${workflow.title}"
Workflow details: ${JSON.stringify(workflow.workflow_data, null, 2)}
`;
      }
    }

    // First, generate the implementation guidance prompt
    const promptGenerationResponse = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { 
          role: 'system', 
          content: systemPrompts.implementationGuidance 
        },
        { 
          role: 'user', 
          content: opportunity 
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const implementationPrompt = promptGenerationResponse.choices[0].message.content || '';

    // Now, use the generated prompt to create the implementation guidance
    const guidanceResponse = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: [
        { 
          role: 'system', 
          content: `You are an expert implementation consultant who provides practical, detailed guidance on implementing business automation solutions. Focus on clear, actionable steps that a business user could follow.${workflowContext ? '\n\n' + workflowContext : ''}` 
        },
        { 
          role: 'user', 
          content: implementationPrompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const guidance = guidanceResponse.choices[0].message.content || '';

    return res.status(200).json({ guidance });
  } catch (error) {
    console.error('Error generating implementation guidance:', error);
    return res.status(500).json({ error: 'Failed to generate implementation guidance' });
  }
} 