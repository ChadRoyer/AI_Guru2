import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts } from '@/lib/prompts';
import { supabase } from '@/lib/supabaseClient';
import { type ChatCompletionMessageParam } from 'openai/resources';
import { webSearch } from '@/lib/search';

type SuggestAutomationResponse = {
  suggestions: string;
  message?: string; // Optional message for tool call responses
  search_results?: string; // Optional search results
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
    // Define the tool schema
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description: "Performs a web search to find relevant information, examples, or documentation.",
          parameters: {
            type: "object" as const,
            properties: {
              query: {
                type: "string" as const,
                description: "The search query to use. For example, 'AI tools for automated customer support ticket tagging'."
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 2000,
      tools: tools,
      tool_choice: "auto"
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
      // Handle tool calls
      const toolCalls = message.tool_calls;
      // For now, we'll focus on the first tool call if multiple are present
      // and assume it's a web_search if the LLM is requesting tools.
      // In a more robust implementation, you might loop through toolCalls
      // and handle different types of tools.
      const toolCall = toolCalls[0];

      if (toolCall.function.name === 'web_search') {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const query = args.query;

          if (!query) {
            return res.status(400).json({ error: "Search query missing in tool call arguments." });
          }

          console.log(`Performing web search for query: ${query}`);
          const searchResults = await webSearch(query); // This is an array of { title, link, snippet }

          // Construct the tool response message
          const toolResponseMessageContent = `Web search results for query '${query}':\n${
            searchResults.map(r => `- ${r.title} (${r.link}): ${r.snippet}`).join('\n')
          }`;
          
          const toolResponseMessage: ChatCompletionMessageParam = {
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResponseMessageContent,
          };

          // Append the LLM's first response (assistant message with tool_calls) and the tool response message
          apiMessages.push(message); // Add assistant's message that included the tool call
          apiMessages.push(toolResponseMessage); // Add the tool's response

          // Make a second call to OpenAI API
          const secondResponse = await openai.chat.completions.create({
            model: getOpenAIModel(),
            messages: apiMessages, // Send the whole conversation history including the tool response
            temperature: 0.7,
            max_tokens: 2000,
            // Do NOT include 'tools' or 'tool_choice' here, we want a direct answer
          });

          const suggestions = secondResponse.choices[0].message.content || '';
          
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
          console.error('Error processing web_search tool call or in second LLM call:', error);
          return res.status(500).json({ error: 'Failed to process web search or get final suggestions' });
        }
      } else {
        // Handle other tool calls if any, or return an error if unexpected
        console.warn(`Unexpected tool call: ${toolCall.function.name}`);
        return res.status(400).json({ error: `Unexpected tool call: ${toolCall.function.name}` });
      }
    } else {
      // This is the path if no tool_calls were in the first LLM response
      const suggestions = message.content || '';

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
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
} 