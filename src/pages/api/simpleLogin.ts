import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabaseClient';

type SimpleLoginResponse = {
  success: boolean;
  session?: any;
  error?: string;
  details?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SimpleLoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, companyName } = req.body;

  if (!email || !companyName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email and company name are required' 
    });
  }

  try {
    // Get the admin client to create or sign in user directly
    const adminClient = createAdminClient();
    
    // Check if user exists first
    let userId;
    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const existingUser = usersData?.users?.find(user => user.email === email);
      
      if (existingUser) {
        console.log("Found existing user:", existingUser.id);
        userId = existingUser.id;
        
        // Update user metadata if needed
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { company_name: companyName }
        });
      } else {
        // Create new user without sending verification email
        const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
          email: email,
          email_confirm: true, // Skip email verification
          user_metadata: {
            company_name: companyName
          }
        });
        
        if (createError) {
          console.error("Error creating user:", createError);
          throw createError;
        }
        
        console.log("Created new user:", newUserData?.user?.id);
        userId = newUserData?.user?.id;
      }
    } catch (error) {
      console.error("Error checking/creating user:", error);
      throw error;
    }
    
    if (!userId) {
      throw new Error("Failed to get valid user ID");
    }
    
    // Create a session directly through admin API
    let sessionData;
    try {
      // This is the key part - we use admin API to create a session without email verification
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': `${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create session: ${response.status} - ${errorText}`);
      }
      
      sessionData = await response.json();
      console.log("Created session for user");
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
    
    // Return the session so client can store it
    return res.status(200).json({
      success: true,
      session: sessionData
    });
  } catch (error: any) {
    console.error('Error in simple login:', error);
    
    // Provide detailed error information
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An error occurred during login',
      details: {
        code: error.code,
        status: error.status,
        name: error.name,
        hint: error.hint,
        details: error.details
      }
    });
  }
} 