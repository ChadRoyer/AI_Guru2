import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, createAdminClient } from '@/lib/supabaseClient';

type TestResponse = {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email is required'
    });
  }

  try {
    // Test Supabase authentication by sending a magic link
    console.log(`Testing auth with email: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/test-supabase`,
      }
    });

    if (error) {
      console.error('Auth error:', error);
      return res.status(500).json({
        success: false,
        message: 'Supabase authentication test failed',
        error
      });
    }

    // Now test the admin client capabilities
    try {
      console.log('Testing admin client auth capabilities...');
      const adminClient = createAdminClient();
      
      // Just list users with page parameters
      const { data: userData, error: userError } = await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });

      if (userError) {
        console.error('Admin auth error:', userError);
        return res.status(500).json({
          success: false,
          message: 'Admin auth capabilities test failed',
          error: userError,
          data: { magicLinkSent: !!data }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Supabase authentication is working correctly. Check your email for the magic link.',
        data: {
          magicLinkSent: !!data,
          users: userData?.users?.length
        }
      });
    } catch (adminError: any) {
      console.error('Error with admin client:', adminError);
      return res.status(500).json({
        success: false,
        message: 'Error with admin client, but magic link was sent',
        error: adminError,
        data: { magicLinkSent: !!data }
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error
    });
  }
} 