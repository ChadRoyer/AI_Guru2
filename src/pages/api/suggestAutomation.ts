import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts } from '@/lib/prompts';
import { supabase } from '@/lib/supabaseClient';
import { type ChatCompletionMessageParam } from 'openai/resources';

type SuggestAutomationResponse = {
  suggestions: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuggestAutomationResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workflow_id, conversation_id } = req.body;

  if (!workflow_id || !conversation_id) {
    return res.status(400).json({ error: 'Workflow and conversation IDs are required' });
  }

  try {
    // Fetch workflow data
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflow_id)
      .single();
      
    if (workflowError) throw workflowError;
    
    // Fetch conversation messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });
      
    if (messagesError) throw messagesError;

    // Format workflow data for the prompt
    const workflowSummary = `
      Workflow: ${workflow.title || 'Untitled Workflow'}
      Start Event: ${workflow.start_event || 'Not specified'}
      End Event: ${workflow.end_event || 'Not specified'}
      
      ${JSON.stringify(workflow.workflow_data, null, 2)}
    `;

    // Prepare messages for OpenAI
    const conversationMessages: ChatCompletionMessageParam[] = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    // Add the system prompt as the first message
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompts.aiOpportunities },
      ...conversationMessages,
      { 
        role: 'user', 
        content: `Based on our discussion and the workflow summary below, please identify automation opportunities:\n\n${workflowSummary}`
      }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2000
    });

    const suggestions = response.choices[0].message.content || '';

    // Save the suggestions to the workflow record
    await supabase
      .from('workflows')
      .update({
        opportunities: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow_id);

    return res.status(200).json({ 
      suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
} 