import type { NextApiRequest, NextApiResponse } from 'next';
// Ensure you have a way to get the standard Supabase client, not just admin
import { supabase, createAdminClient } from '@/lib/supabaseClient'; 
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import crypto from 'crypto';

type SimpleLoginResponse = {
  success: boolean;
  session?: any;
  user?: any;
  error?: string;
  details?: any;
};

// Simple in-memory rate limiting and deduplication
const requestTracker = new Map<string, { count: number; lastRequest: number; inProgress: boolean }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const tracker = requestTracker.get(key);
  
  if (!tracker) {
    requestTracker.set(key, { count: 1, lastRequest: now, inProgress: false });
    return true;
  }
  
  // Reset counter if window has passed
  if (now - tracker.lastRequest > RATE_LIMIT_WINDOW) {
    tracker.count = 1;
    tracker.lastRequest = now;
    tracker.inProgress = false;
    return true;
  }
  
  // Check if request is already in progress
  if (tracker.inProgress) {
    return false;
  }
  
  // Check rate limit
  if (tracker.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  tracker.count++;
  tracker.lastRequest = now;
  return true;
}

function setRequestInProgress(email: string, inProgress: boolean) {
  const key = email.toLowerCase();
  const tracker = requestTracker.get(key);
  if (tracker) {
    tracker.inProgress = inProgress;
  }
}

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
      error: 'Email and company name are required',
    });
  }

  // Check rate limit
  if (!checkRateLimit(email)) {
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please wait a moment before trying again.',
    });
  }

  // Mark request as in progress
  setRequestInProgress(email, true);

  // Create a server client that can set cookies properly
  const supabaseServerClient = createPagesServerClient({ req, res });
  const adminAuth = createAdminClient().auth.admin;

  try {
    let user: any = null;
    let session: any = null;
    const autoPassword = crypto.randomUUID();

    // Check if user exists by listing users and filtering
    // Note: For large numbers of users, this is inefficient. Consider an RPC function.
    const { data: { users }, error: listError } = await adminAuth.listUsers(); 
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = users?.find(u => u.email === email);

    if (existingUser) {
      console.log('Found existing user:', existingUser.id);
      user = existingUser;
      if (user.user_metadata?.company_name !== companyName) {
        const { error: updateError } = await adminAuth.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, company_name: companyName },
        });
        if (updateError) {
          console.warn('Failed to update company name for existing user:', updateError);
        }
      }
      const { error: updateUserPasswordError } = await adminAuth.updateUserById(
        user.id,
        { password: autoPassword }
      );

      if (updateUserPasswordError) {
        console.error('Error updating password for existing user:', updateUserPasswordError);
        throw new Error('Failed to update password for existing user. Please contact support.');
      }
      console.log('Updated password for existing user to auto-generated one.');
      
    } else {
      console.log('User does not exist, creating new user.');
      const { data: newUserData, error: createError } = await adminAuth.createUser({
        email: email,
        password: autoPassword,
        email_confirm: true, 
        user_metadata: { company_name: companyName },
      });

      if (createError) {
        console.error('Error creating new user:', createError);
        if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
            console.warn('Create user failed because user already exists (race condition), trying to fetch again.');
            // Re-fetch and filter, as email might have been created just now
            const { data: { users: existingUsersAgain }, error: listErrorAgain } = await adminAuth.listUsers();
            if (listErrorAgain) throw new Error('Failed to list users after race condition check.');
            const userAfterRace = existingUsersAgain?.find(u => u.email === email);
            if (!userAfterRace) throw new Error('Failed to find user after race condition check.');
            user = userAfterRace;
            const { error: updateUserPasswordError } = await adminAuth.updateUserById(
                user.id,
                { password: autoPassword }
            );
            if (updateUserPasswordError) throw new Error('Failed to set password for existing user found in race condition.');
        } else {
          throw createError;
        }
      } else if (newUserData?.user) {
        user = newUserData.user;
        console.log('Successfully created new user:', user?.id);
      } else {
        // Handle case where createUser succeeds but returns no user data (should not happen)
        throw new Error('User creation succeeded but no user data was returned.');
      }
    }

    if (!user || !user.id) {
      throw new Error('User could not be identified or created.');
    }
    
    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now, sign in the user with the auto-generated password using the server client
    // This will properly set the session cookies for subsequent API calls
    const { data: signInData, error: signInError } = await supabaseServerClient.auth.signInWithPassword({
      email: email,
      password: autoPassword,
    });

    if (signInError) {
      console.error('Error signing in user with auto-password:', signInError);
      // If we hit a rate limit, return a more user-friendly error
      if (signInError.message.includes('rate limit')) {
        throw new Error('Service is temporarily busy. Please wait a moment and try again.');
      }
      throw signInError;
    }

    session = signInData.session;
    user = signInData.user; // Use the user object from signIn for consistency

    console.log('Successfully signed in user:', user?.id);

    return res.status(200).json({
      success: true,
      session: session,
      user: user
    });

  } catch (error: any) {
    console.error('Error in simple login:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'An error occurred during login.',
      details: {
        name: error.name,
        status: error.status,
        // Add more details if available and safe
      },
    });
  } finally {
    // Mark request as no longer in progress
    setRequestInProgress(email, false);
  }
} 