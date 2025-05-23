import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient, User } from '@supabase/supabase-js';

// Define necessary types
export type DbResult<T> = {
  data: T | null;
  error: Error | null;
};

// Check if Supabase credentials are configured
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn('Warning: Supabase credentials are not defined in environment variables');
}

// Create Supabase client
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Function to create Supabase admin client with service role
export const createAdminClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to create admin client');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Helper function to get user from session
export const getSessionUser = async (): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session?.user || null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

// Helper function to check if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .single();
      
    if (error) return false;
    return !!data;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    return false;
  }
}; 