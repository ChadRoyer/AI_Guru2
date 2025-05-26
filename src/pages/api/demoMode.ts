import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseClient';

type DemoModeResponse = {
  success: boolean;
  session?: any;
  conversation_id?: string;
  workflow_id?: string;
  error?: string;
};

// Sample demo data
const DEMO_WORKFLOW_DATA = {
  title: "Customer Onboarding Process",
  start_event: "New customer signs up",
  end_event: "Customer successfully onboarded",
  steps: [
    {
      id: "step-1",
      description: "Customer fills out registration form",
      actor: "Customer",
      system: "Website"
    },
    {
      id: "step-2", 
      description: "System validates customer information",
      actor: "System",
      system: "CRM"
    },
    {
      id: "step-3",
      description: "Account manager reviews application",
      actor: "Account Manager",
      system: "CRM"
    },
    {
      id: "step-4",
      description: "Welcome email sent to customer",
      actor: "System",
      system: "Email Platform"
    },
    {
      id: "step-5",
      description: "Customer completes onboarding checklist",
      actor: "Customer",
      system: "Portal"
    }
  ],
  people: [
    { role: "Customer", responsibilities: "Provide information and complete tasks" },
    { role: "Account Manager", responsibilities: "Review and approve applications" },
    { role: "Support Team", responsibilities: "Assist with onboarding issues" }
  ],
  systems: [
    { name: "Website", purpose: "Customer registration" },
    { name: "CRM", purpose: "Customer data management" },
    { name: "Email Platform", purpose: "Automated communications" },
    { name: "Customer Portal", purpose: "Self-service onboarding" }
  ],
  pain_points: [
    "Manual review process causes delays",
    "Customers often miss onboarding steps",
    "No automated follow-up for incomplete applications",
    "Multiple systems require manual data entry"
  ]
};

const DEMO_DIAGRAM_DATA = {
  nodes: [
    {
      id: "step-1",
      type: "default",
      position: { x: 100, y: 50 },
      data: { 
        label: "Customer Registration",
        actor: "Customer",
        system: "Website"
      }
    },
    {
      id: "step-2",
      type: "default", 
      position: { x: 100, y: 150 },
      data: {
        label: "Information Validation",
        actor: "System",
        system: "CRM"
      }
    },
    {
      id: "step-3",
      type: "default",
      position: { x: 100, y: 250 },
      data: {
        label: "Manager Review",
        actor: "Account Manager", 
        system: "CRM"
      }
    },
    {
      id: "step-4",
      type: "default",
      position: { x: 100, y: 350 },
      data: {
        label: "Welcome Email",
        actor: "System",
        system: "Email Platform"
      }
    },
    {
      id: "step-5",
      type: "default",
      position: { x: 100, y: 450 },
      data: {
        label: "Complete Checklist",
        actor: "Customer",
        system: "Portal"
      }
    }
  ],
  edges: [
    {
      id: "edge-step-1-step-2",
      source: "step-1",
      target: "step-2",
      type: "smoothstep"
    },
    {
      id: "edge-step-2-step-3", 
      source: "step-2",
      target: "step-3",
      type: "smoothstep"
    },
    {
      id: "edge-step-3-step-4",
      source: "step-3", 
      target: "step-4",
      type: "smoothstep"
    },
    {
      id: "edge-step-4-step-5",
      source: "step-4",
      target: "step-5", 
      type: "smoothstep"
    }
  ]
};

const DEMO_MESSAGES = [
  {
    role: "assistant",
    content: "Hello! I'm Workflow-Sage, your AI assistant for mapping business workflows. I'll help you document your customer onboarding process step by step. Let's start by understanding what triggers this workflow - what event starts your customer onboarding process?"
  },
  {
    role: "user", 
    content: "It starts when a new customer signs up on our website."
  },
  {
    role: "assistant",
    content: "Perfect! So the trigger is 'New customer signs up'. Now, let's walk through the process step by step. What happens immediately after a customer signs up on your website?"
  },
  {
    role: "user",
    content: "The customer fills out a registration form with their company details, and then our system validates the information they provided."
  },
  {
    role: "assistant", 
    content: "Great! I can see we have two steps there:\n1. Customer fills out registration form\n2. System validates customer information\n\nAfter the system validates the information, what's the next step in your process?"
  },
  {
    role: "user",
    content: "An account manager reviews the application to make sure everything looks good, then if approved, we send a welcome email and the customer gets access to complete their onboarding checklist in our portal."
  },
  {
    role: "assistant",
    content: "Excellent! I now have a complete picture of your customer onboarding workflow. Let me summarize what I've learned:\n\n```json\n" + JSON.stringify(DEMO_WORKFLOW_DATA, null, 2) + "\n```\n\nThis workflow shows a clear 5-step process from initial signup to completed onboarding. I can see several areas where automation could help, particularly around the manual review process and follow-up communications. Would you like me to generate some automation suggestions for this workflow?"
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DemoModeResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const adminClient = createAdminClient();
    
    // Create a demo user with a unique identifier
    const demoEmail = `demo-${Date.now()}@demo.local`;
    const demoPassword = `demo-${Math.random().toString(36).substring(7)}`;
    
    console.log('[DEMO_MODE] Creating demo user:', demoEmail);
    
    // Create demo user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        company_name: 'Demo Company',
        is_demo: true
      }
    });
    
    if (authError || !authData.user) {
      console.error('[DEMO_MODE] Error creating demo user:', authError);
      throw new Error('Failed to create demo user');
    }
    
    const demoUserId = authData.user.id;
    console.log('[DEMO_MODE] Created demo user with ID:', demoUserId);
    
    // Create demo organization
    const { data: demoOrg, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        domain: 'demo.local',
        name: 'Demo Company'
      })
      .select()
      .single();
      
    if (orgError) {
      console.error('[DEMO_MODE] Error creating demo organization:', orgError);
      throw new Error('Failed to create demo organization');
    }
    
    console.log('[DEMO_MODE] Created demo organization:', demoOrg.id);
    
    // Create demo profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        user_id: demoUserId,
        org_id: demoOrg.id,
        email: demoEmail,
        company_name: 'Demo Company'
      });
      
    if (profileError) {
      console.error('[DEMO_MODE] Error creating demo profile:', profileError);
      throw new Error('Failed to create demo profile');
    }
    
    console.log('[DEMO_MODE] Created demo profile');
    
    // Create demo workflow
    const { data: demoWorkflow, error: workflowError } = await adminClient
      .from('workflows')
      .insert({
        user_id: demoUserId,
        org_id: demoOrg.id,
        title: DEMO_WORKFLOW_DATA.title,
        start_event: DEMO_WORKFLOW_DATA.start_event,
        end_event: DEMO_WORKFLOW_DATA.end_event,
        workflow_data: DEMO_WORKFLOW_DATA,
        diagram_data: DEMO_DIAGRAM_DATA
      })
      .select()
      .single();
      
    if (workflowError) {
      console.error('[DEMO_MODE] Error creating demo workflow:', workflowError);
      throw new Error('Failed to create demo workflow');
    }
    
    console.log('[DEMO_MODE] Created demo workflow:', demoWorkflow.id);
    
    // Create demo conversation
    const { data: demoConversation, error: conversationError } = await adminClient
      .from('conversations')
      .insert({
        workflow_id: demoWorkflow.id,
        user_id: demoUserId,
        title: 'Demo Conversation'
      })
      .select()
      .single();
      
    if (conversationError) {
      console.error('[DEMO_MODE] Error creating demo conversation:', conversationError);
      throw new Error('Failed to create demo conversation');
    }
    
    console.log('[DEMO_MODE] Created demo conversation:', demoConversation.id);
    
    // Insert demo messages
    const messagesToInsert = DEMO_MESSAGES.map(msg => ({
      conversation_id: demoConversation.id,
      role: msg.role,
      content: msg.content
    }));
    
    const { error: messagesError } = await adminClient
      .from('messages')
      .insert(messagesToInsert);
      
    if (messagesError) {
      console.error('[DEMO_MODE] Error creating demo messages:', messagesError);
      throw new Error('Failed to create demo messages');
    }
    
    console.log('[DEMO_MODE] Created demo messages');
    
    // Create session for demo user
    const { data: sessionData, error: sessionError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: demoEmail
    });
    
    if (sessionError || !sessionData) {
      console.error('[DEMO_MODE] Error creating demo session:', sessionError);
      throw new Error('Failed to create demo session');
    }
    
    // Sign in the demo user to get a proper session
    const { data: signInData, error: signInError } = await adminClient.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword
    });
    
    if (signInError || !signInData.session) {
      console.error('[DEMO_MODE] Error signing in demo user:', signInError);
      throw new Error('Failed to sign in demo user');
    }
    
    console.log('[DEMO_MODE] Demo mode setup complete');
    
    return res.status(200).json({
      success: true,
      session: signInData.session,
      conversation_id: demoConversation.id,
      workflow_id: demoWorkflow.id
    });
    
  } catch (error: any) {
    console.error('[DEMO_MODE] Error in demo mode setup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to setup demo mode'
    });
  }
} 