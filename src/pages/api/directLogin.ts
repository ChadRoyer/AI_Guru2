import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, createAdminClient } from '@/lib/supabaseClient';

type DirectLoginResponse = {
  success: boolean;
  session?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DirectLoginResponse>
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
    // Get the admin client to create or update user
    const adminClient = createAdminClient();
    
    // For this simplified approach, we'll create a sign-in link
    // This avoids needing to know or set a password
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { company_name: companyName }
      }
    });
    
    if (error) throw error;
    
    // Return success - the user will need to check their email
    return res.status(200).json({
      success: true,
      session: {
        user: {
          email,
          user_metadata: { company_name: companyName }
        }
      }
    });
  } catch (error: any) {
    console.error('Error in direct login:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'An error occurred during login' 
    });
  }
} 