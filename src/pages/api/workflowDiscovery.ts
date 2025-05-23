import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts } from '@/lib/prompts';
import { type ChatCompletionMessageParam } from 'openai/resources';
import { supabase, createAdminClient } from '@/lib/supabaseClient';

type WorkflowDiscoveryResponse = {
  message: string;
  conversation_id: string;
  workflow_id?: string;
  is_complete?: boolean;
};

// Type for the conversation history
type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

// Types for React Flow
type NodeData = {
  label: string;
  actor?: string;
  system?: string;
};

type Node = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
};

type Edge = {
  id: string;
  source: string;
  target: string;
  type: string;
};

// Type for workflow data
type WorkflowData = {
  title: string;
  start_event: string;
  end_event: string;
  steps: Array<{
    id?: string;
    description: string;
    actor?: string;
    system?: string;
  }>;
  people: Array<any>;
  systems: Array<any>;
  pain_points: Array<string>;
};

// Function to check if the response contains a complete workflow
function isWorkflowComplete(content: string): boolean {
  return content.includes('"title"') && 
         content.includes('"start_event"') && 
         content.includes('"end_event"') && 
         content.includes('"steps"') && 
         content.includes('"people"') && 
         content.includes('"systems"') &&
         content.includes('"pain_points"');
}

// Function to extract workflow JSON from the response
function extractWorkflowJson(content: string): WorkflowData | null {
  try {
    const jsonMatch = content.match(/{[\s\S]*"title"[\s\S]*"start_event"[\s\S]*"end_event"[\s\S]*"steps"[\s\S]*"people"[\s\S]*"systems"[\s\S]*"pain_points"[\s\S]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as WorkflowData;
    }
  } catch (error) {
    console.error('Error parsing workflow JSON:', error);
  }
  return null;
}

// Function to generate diagram data from workflow data
function generateDiagramFromWorkflow(workflowData: WorkflowData): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Create nodes for each step
  if (workflowData.steps && Array.isArray(workflowData.steps)) {
    workflowData.steps.forEach((step, index) => {
      const id = step.id || `step-${index}`;
      nodes.push({
        id,
        type: 'default',
        position: { x: 250, y: 100 + index * 100 },
        data: { 
          label: step.description || `Step ${index + 1}`,
          actor: step.actor,
          system: step.system
        }
      });
      
      // If not the first step, connect to previous step
      if (index > 0) {
        const prevId = workflowData.steps[index - 1].id || `step-${index - 1}`;
        edges.push({
          id: `edge-${index}`,
          source: prevId,
          target: id,
          type: 'default'
        });
      }
    });
  }
  
  return { nodes, edges };
}

// Function to ensure a user profile exists
async function ensureUserProfile(userId: string, adminClient: any) {
  try {
    // Try to get the user's profile
    const { data: existingProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // If profile exists, return it
    if (existingProfile && !profileError) {
      return existingProfile;
    }
    
    // If profile doesn't exist, get user info
    const { data: userData, error: userError } = await adminClient
      .auth.admin.getUserById(userId);
    
    if (userError || !userData?.user) {
      throw new Error(`Failed to get user data: ${userError?.message}`);
    }
    
    const userEmail = userData.user.email;
    const domainPart = userEmail?.split('@')[1] || '';
    let companyName = userData.user.user_metadata?.company_name || domainPart;
    
    // Check if organization exists
    let orgId;
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('domain', domainPart)
      .single();
    
    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
      // Create new organization
      const { data: newOrg, error: orgError } = await adminClient
        .from('organizations')
        .insert({ domain: domainPart, name: companyName })
        .select()
        .single();
      
      if (orgError) {
        throw new Error(`Failed to create organization: ${orgError.message}`);
      }
      
      orgId = newOrg.id;
    }
    
    // Create profile
    const { data: newProfile, error: newProfileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: userId,
        org_id: orgId,
        email: userEmail,
        company_name: companyName
      })
      .select()
      .single();
    
    if (newProfileError) {
      throw new Error(`Failed to create profile: ${newProfileError.message}`);
    }
    
    return newProfile;
  } catch (error) {
    console.error('Error ensuring user profile:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkflowDiscoveryResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, conversation_id, workflow_id, user_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get admin client to bypass RLS for some operations
    const adminClient = createAdminClient();
    
    // Initialize variables for tracking
    let currentConversationId = conversation_id;
    let currentWorkflowId = workflow_id;
    let messages: ChatCompletionMessageParam[] = [];
    
    // If we have a conversation ID, fetch the existing messages
    if (currentConversationId) {
      // Fetch previous messages from the database
      const { data: previousMessages, error } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      // Add previous messages to the context (excluding system messages)
      messages = previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      // Add the new user message
      messages.push({
        role: 'user',
        content: message
      });
    } else {
      // This is a new conversation, create a workflow and conversation
      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required for new conversations' });
      }
      
      // Ensure the user has a profile
      const userProfile = await ensureUserProfile(user_id, adminClient);
      
      // Create a new workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('workflows')
        .insert({
          user_id,
          org_id: userProfile.org_id,
          title: 'New Workflow',
          diagram_data: { nodes: [], edges: [] }
        })
        .select()
        .single();
        
      if (workflowError) throw workflowError;
      
      currentWorkflowId = workflow.id;
      
      // Create a new conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          workflow_id: currentWorkflowId,
          user_id,
          title: 'New Workflow Conversation'
        })
        .select()
        .single();
        
      if (conversationError) throw conversationError;
      
      currentConversationId = conversation.id;
      
      // Start the conversation with the system prompt
      messages = [
        { 
          role: 'system', 
          content: systemPrompts.workflowDiscovery 
        },
        { 
          role: 'user', 
          content: message 
        }
      ];
      
      // Save the system message to the database
      await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          role: 'system',
          content: systemPrompts.workflowDiscovery
        });
    }

    // Log the messages being sent to help with debugging
    console.log('Sending messages to OpenAI:', JSON.stringify(messages, null, 2));

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: getOpenAIModel(),
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const assistantResponse = response.choices[0].message.content || '';
    
    // Save the user message to the database
    await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'user',
        content: message
      });
    
    // Save the AI response to the database
    await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversationId,
        role: 'assistant',
        content: assistantResponse
      });
    
    // Check if the response contains a complete workflow JSON
    const isComplete = isWorkflowComplete(assistantResponse);
    
    // If workflow is complete, extract the JSON and update the workflow
    if (isComplete && currentWorkflowId) {
      const workflowData = extractWorkflowJson(assistantResponse);
      
      if (workflowData) {
        // Generate diagram data from workflow data
        const diagramData = generateDiagramFromWorkflow(workflowData);
        
        // Update the workflow with the structured data and diagram
        await supabase
          .from('workflows')
          .update({
            title: workflowData.title,
            start_event: workflowData.start_event,
            end_event: workflowData.end_event,
            workflow_data: workflowData,
            diagram_data: diagramData,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentWorkflowId);
          
        // Update the conversation title to match the workflow
        await supabase
          .from('conversations')
          .update({
            title: workflowData.title,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentConversationId);
      }
    }
    
    // Return the assistant's response and relevant IDs
    return res.status(200).json({ 
      message: assistantResponse,
      conversation_id: currentConversationId,
      workflow_id: currentWorkflowId,
      is_complete: isComplete
    });
  } catch (error) {
    console.error('Error in workflow discovery:', error);
    return res.status(500).json({ error: 'Failed to process workflow discovery request' });
  }
} 