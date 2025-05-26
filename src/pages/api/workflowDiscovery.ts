import type { NextApiRequest, NextApiResponse } from 'next';
import openai, { getOpenAIModel } from '@/lib/openai';
import { systemPrompts } from '@/lib/prompts';
import { type ChatCompletionMessageParam } from 'openai/resources';
import { createAdminClient } from '@/lib/supabaseClient';
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';

type WorkflowDiscoveryResponse = {
  message: string;
  conversation_id: string;
  workflow_id?: string;
  is_complete?: boolean;
  /** True if diagram_data was generated during this request */
  has_diagram?: boolean;
  /** Structured workflow JSON extracted from the assistant response, when available */
  workflow_data?: WorkflowData;
  /** React-Flow diagram corresponding to the workflow_data, when available */
  diagram_data?: { nodes: Node[]; edges: Edge[] };
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

// -----------------------------  JSON UTILITIES  -----------------------------

/**
 * Attempt to extract the first parsable JSON object from an arbitrary string.
 * 1. Strips ```json / ``` fences if present.
 * 2. Scans for balanced braces and tries JSON.parse progressively.
 */
function tryExtractJson(raw: string): any | null {
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  const braceRegex = /{[^]*?}/g; // non-greedy so we test smaller chunks first
  const matches = cleaned.match(braceRegex);
  if (!matches) return null;
  for (const candidate of matches) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* continue */
    }
  }
  return null;
}

/** Determine whether the assistant response now contains *enough* workflow data. */
function isWorkflowComplete(content: string): boolean {
  const obj = tryExtractJson(content);
  if (!obj) return false;

  // Required core fields
  if (!obj.title || !Array.isArray(obj.steps) || obj.steps.length === 0) return false;

  // Count additional populated arrays / strings as evidence of completeness
  let additional = 0;
  if (obj.people && Array.isArray(obj.people) && obj.people.length) additional++;
  if (obj.systems && Array.isArray(obj.systems) && obj.systems.length) additional++;
  if (obj.pain_points && Array.isArray(obj.pain_points) && obj.pain_points.length) additional++;
  if (obj.start_event) additional++;
  if (obj.end_event) additional++;

  return additional >= 2;
}

function extractWorkflowJson(content: string): WorkflowData | null {
  const obj = tryExtractJson(content);
  if (!obj) return null;
  // Very light validation: must have title & steps array
  if (obj.title && Array.isArray(obj.steps)) {
    return obj as WorkflowData;
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
        position: { x: Math.random() * 400, y: index * 100 },
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
          id: `edge-${prevId}-${id}`,
          source: prevId,
          target: id,
          type: 'smoothstep'
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
    console.log(`[ensureUserProfile] Checking profile for user ID: ${userId}`);
    const { data: existingProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('user_id, email, company_name, org_id, organizations (id, name, domain)')
      .eq('user_id', userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 0 rows
        console.error(`[ensureUserProfile] Error fetching profile for user ${userId}:`, profileError);
        throw profileError;
    }
    
    if (existingProfile) {
      console.log(`[ensureUserProfile] Found existing profile for user ${userId}:`, JSON.stringify(existingProfile, null, 2));
      if (!existingProfile.org_id) {
        console.warn(`[ensureUserProfile] Existing profile for user ${userId} is missing org_id. Attempting to fix.`);
        // Fall through to create/assign org logic
      } else {
        return existingProfile;
      }
    } else {
        console.log(`[ensureUserProfile] No existing profile for user ${userId}. Creating one.`);
    }
    
    // If profile doesn't exist or org_id is missing, get user info & create/assign org
    const { data: userDataResponse, error: userError } = await adminClient
      .auth.admin.getUserById(userId);
    
    if (userError || !userDataResponse?.user) {
      throw new Error(`[ensureUserProfile] Failed to get user data for ${userId}: ${userError?.message}`);
    }
    const authUser = userDataResponse.user;
    console.log(`[ensureUserProfile] Fetched auth user data for ${userId}:`, JSON.stringify(authUser, null, 2));
    
    const userEmail = authUser.email;
    if (!userEmail) throw new Error(`[ensureUserProfile] User ${userId} has no email.`);

    const emailDomain = userEmail.split('@')[1] || 'default.com'; // Fallback domain
    // Prefer company_name from metadata, then from profile (if somehow exists and was passed), then email domain
    const companyNameFromMeta = authUser.user_metadata?.company_name;
    const companyNameToUse = companyNameFromMeta || emailDomain; // Simplified: use metadata or fall back to domain
    const orgDomainToUse = emailDomain; // Use email domain for org's domain field for uniqueness

    console.log(`[ensureUserProfile] User: ${userId}, Email: ${userEmail}, EmailDomain: ${emailDomain}, CompanyNameFromMeta: ${companyNameFromMeta}, CompanyNameToUse: ${companyNameToUse}, OrgDomainToUse: ${orgDomainToUse}`);

    let orgId;
    // Try to find organization by domain
    const { data: existingOrg, error: orgSelectError } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('domain', orgDomainToUse) // Match by domain
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 row without error

    if (orgSelectError && orgSelectError.code !== 'PGRST116'){
        console.error(`[ensureUserProfile] Error fetching organization by domain ${orgDomainToUse}:`, orgSelectError);
        throw orgSelectError;
    }

    if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`[ensureUserProfile] Found existing organization ID ${orgId} for domain ${orgDomainToUse} (Name: ${existingOrg.name}).`);
      // Optionally, update org name if companyNameToUse is different and more accurate
      if (existingOrg.name !== companyNameToUse) {
          console.log(`[ensureUserProfile] Org name mismatch. Current: "${existingOrg.name}", New: "${companyNameToUse}". Updating org name.`);
          const {error: updateOrgError} = await adminClient.from('organizations').update({name: companyNameToUse}).eq('id', orgId);
          if(updateOrgError) console.warn(`[ensureUserProfile] Failed to update organization name for org ${orgId}:`, updateOrgError);
      }
    } else {
      console.log(`[ensureUserProfile] No organization found for domain ${orgDomainToUse}. Creating new one with name "${companyNameToUse}".`);
      const { data: newOrg, error: orgCreateError } = await adminClient
        .from('organizations')
        .insert({ domain: orgDomainToUse, name: companyNameToUse })
        .select('id')
        .single();
      
      if (orgCreateError) {
        console.error(`[ensureUserProfile] Failed to create organization for domain ${orgDomainToUse}, name "${companyNameToUse}":`, orgCreateError);
        throw orgCreateError;
      }
      orgId = newOrg.id;
      console.log(`[ensureUserProfile] Created new organization ID ${orgId} for domain ${orgDomainToUse}, name "${companyNameToUse}".`);
    }
    
    // Create or Update profile
    console.log(`[ensureUserProfile] Upserting profile for user ${userId} with org_id ${orgId}, email ${userEmail}, company_name "${companyNameToUse}".`);
    const { data: upsertedProfile, error: upsertProfileError } = await adminClient
      .from('profiles')
      .upsert({
        user_id: userId,
        org_id: orgId,
        email: userEmail,
        company_name: companyNameToUse // Store the company name used for org association
      }, { onConflict: 'user_id' }) // Use upsert to handle creation or update
      .select('user_id, email, company_name, org_id, organizations (id, name, domain)')
      .single();
    
    if (upsertProfileError) {
      console.error(`[ensureUserProfile] Failed to upsert profile for user ${userId}:`, upsertProfileError);
      throw upsertProfileError;
    }
    console.log(`[ensureUserProfile] Successfully upserted profile for user ${userId}:`, JSON.stringify(upsertedProfile, null, 2));
    return upsertedProfile;
  } catch (error) {
    console.error(`[ensureUserProfile] Critical error for user ID ${userId}:`, error);
    throw error; // Re-throw to be caught by the main handler
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WorkflowDiscoveryResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Create a Supabase client authenticated for the current user
  // This client will be used for operations that need RLS based on user context
  const supabaseUserClient = createPagesServerClient({ req, res });

  try {
    const { message, conversation_id, workflow_id, user_id: userIdFromRequest } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    const adminClient = createAdminClient(); // For operations that need admin privileges
    
    let currentConversationId = conversation_id;
    let currentWorkflowId = workflow_id;
    let messages: ChatCompletionMessageParam[] = [];
    
    // --- DIAGNOSTIC LOGGING (Updated to use supabaseUserClient for user info) ---
    console.log('[WF_DISCOVERY_API] Request body:', JSON.stringify(req.body, null, 2));
    
    const { data: { user: authenticatedUser }, error: authUserError } = await supabaseUserClient.auth.getUser();
    if (authUserError) {
      console.error('[WF_DISCOVERY_API] Error getting user from supabaseUserClient.auth.getUser():', authUserError.message);
      return res.status(401).json({ error: 'Authentication failed: ' + authUserError.message });
    }
    console.log('[WF_DISCOVERY_API] User from supabaseUserClient.auth.getUser():', JSON.stringify(authenticatedUser, null, 2));
    
    // It is crucial that operations requiring user context use supabaseUserClient
    // The `userIdFromRequest` from the body should ideally match `authenticatedUser.id`
    // or be validated against it.
    if (!authenticatedUser) {
        console.error('[WF_DISCOVERY_API] No authenticated user found via Auth Helpers. RLS will fail.');
        return res.status(401).json({ error: 'User not authenticated. Please log in again.' });
    }
    
    // Validate that the user ID from request matches the authenticated user
    if (userIdFromRequest && userIdFromRequest !== authenticatedUser.id) {
        console.error(`[WF_DISCOVERY_API] User ID mismatch: userIdFromRequest=${userIdFromRequest}, authenticatedUser.id=${authenticatedUser.id}`);
        return res.status(403).json({ error: 'User ID mismatch. Access denied.' });
    }
    // --- END OF DIAGNOSTIC LOGGING ---

    if (currentConversationId) {
      console.log(`[WF_DISCOVERY_API] Existing conversation ID: ${currentConversationId}`);
      const { data: previousMessages, error } = await supabaseUserClient // Use user-context client
        .from('messages')
        .select('role, content')
        .eq('conversation_id', currentConversationId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('[WF_DISCOVERY_API] Error fetching previous messages:', error);
        throw error;
      }
      
      // Always start with the system prompt for context
      messages = [
        { role: 'system', content: systemPrompts.workflowDiscovery }
      ];
      
      // Add previous messages
      messages.push(...previousMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })));
      
      // Add the new user message
      messages.push({
        role: 'user',
        content: message
      });
    } else {
      // The actual RLS check for inserting workflow will use authenticatedUser.id via supabaseUserClient.
      if (!userIdFromRequest) { 
        console.error('[WF_DISCOVERY_API] User ID (userIdFromRequest) is required for new conversations but not provided.');
        return res.status(400).json({ error: 'User ID (userIdFromRequest) is required for new conversations' });
      }
      
      console.log(`[WF_DISCOVERY_API] New conversation. User ID from req.body (userIdFromRequest): ${userIdFromRequest}`);
      // ensureUserProfile uses adminClient, which is fine for creating/managing profiles if needed.
      // Use the authenticated user ID for profile operations
      const userProfile = await ensureUserProfile(authenticatedUser.id, adminClient); 
      console.log('[WF_DISCOVERY_API] User Profile from ensureUserProfile:', JSON.stringify(userProfile, null, 2));
      
      if (!userProfile || !userProfile.org_id) {
        console.error('[WF_DISCOVERY_API] Failed to get user profile or org_id from ensureUserProfile.');
        throw new Error('Failed to ensure user profile or obtain organization ID.');
      }
      const orgIdToInsert = userProfile.org_id;
      console.log(`[WF_DISCOVERY_API] Org ID for new workflow: ${orgIdToInsert}`);
      console.log(`[WF_DISCOVERY_API] User ID for new workflow (from authenticatedUser.id): ${authenticatedUser.id}`);

      // Create a new workflow - USE supabaseUserClient for RLS
      const { data: workflow, error: workflowError } = await supabaseUserClient
        .from('workflows')
        .insert({
          user_id: authenticatedUser.id,
          org_id: orgIdToInsert, 
          title: 'New Workflow' 
        })
        .select()
        .single();
        
      if (workflowError) {
        console.error('[WF_DISCOVERY_API] Error creating workflow:', JSON.stringify(workflowError, null, 2));
        throw workflowError; 
      }
      
      currentWorkflowId = workflow.id;
      console.log(`[WF_DISCOVERY_API] Created new workflow with ID: ${currentWorkflowId}`);

      const { data: conversation, error: conversationError } = await supabaseUserClient // Use user-context client
        .from('conversations')
        .insert({
          workflow_id: currentWorkflowId,
          user_id: authenticatedUser.id,
          title: 'New Conversation'
        })
        .select()
        .single();

      if (conversationError) {
        console.error('[WF_DISCOVERY_API] Error creating conversation:', conversationError);
        throw conversationError;
      }
      currentConversationId = conversation.id;
      console.log(`[WF_DISCOVERY_API] Created new conversation with ID: ${currentConversationId}`);
      
      messages = [
        { role: 'system', content: systemPrompts.workflowDiscovery },
        { role: 'user', content: message }
      ];
    }

    // Call OpenAI API
    const modelName = getOpenAIModel();
    console.log(`[WF_DISCOVERY_API] Calling OpenAI model: ${modelName} with ${messages.length} messages.`);
    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponseContent = response.choices[0].message.content || '';
    console.log('[WF_DISCOVERY_API] OpenAI response received.');

    // Save user message and AI response to the database
    if (currentConversationId) {
      console.log(`[WF_DISCOVERY_API] Saving messages to conversation ID: ${currentConversationId}`);
      const messagesToSave = [
        { conversation_id: currentConversationId, role: 'user', content: message },
        { conversation_id: currentConversationId, role: 'assistant', content: aiResponseContent }
      ];
      // Use supabaseUserClient for inserting messages if messages table has RLS based on user
      const { error: saveMessagesError } = await supabaseUserClient.from('messages').insert(messagesToSave);
      if (saveMessagesError) {
        console.error('[WF_DISCOVERY_API] Error saving messages:', saveMessagesError);
      } else {
        console.log('[WF_DISCOVERY_API] User and AI messages saved to DB.');
      }
    }
    
    const isComplete = isWorkflowComplete(aiResponseContent);
    let workflowData: WorkflowData | null = null;
    let diagramData: { nodes: Node[]; edges: Edge[] } | null = null;
    if (isComplete) {
      console.log('[WF_DISCOVERY_API] Workflow detected as complete in AI response.');
      workflowData = extractWorkflowJson(aiResponseContent);
      if (workflowData && currentWorkflowId) {
        console.log(`[WF_DISCOVERY_API] Extracted workflow data, updating workflow ID: ${currentWorkflowId}`);
        diagramData = generateDiagramFromWorkflow(workflowData);
        // Use supabaseUserClient for updating workflow if RLS applies
        const { error: updateWorkflowError } = await supabaseUserClient 
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
        
        if (updateWorkflowError) {
          console.error('[WF_DISCOVERY_API] Error updating workflow with extracted data:', updateWorkflowError);
        } else {
          console.log(`[WF_DISCOVERY_API] Workflow ID: ${currentWorkflowId} updated with extracted data.`);
        }
      } else if (workflowData) {
        console.warn('[WF_DISCOVERY_API] Workflow data extracted, but no currentWorkflowId to update.');
      } else {
        console.warn('[WF_DISCOVERY_API] Workflow detected as complete, but failed to extract JSON.');
      }
    }

    console.log('[WF_DISCOVERY_API] Sending response to client.');
    return res.status(200).json({
      message: aiResponseContent,
      conversation_id: currentConversationId,
      workflow_id: currentWorkflowId,
      is_complete: isComplete,
      has_diagram: diagramData !== null,
      workflow_data: workflowData ?? undefined,
      diagram_data: diagramData ?? undefined
    });

  } catch (error: any) {
    console.error('[WF_DISCOVERY_API] Critical error in handler:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return res.status(500).json({ error: error.message || 'Failed to process workflow discovery request' });
  }
} 