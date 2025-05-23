import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase, createAdminClient } from '@/lib/supabaseClient';

type TestResponse = {
  success: boolean;
  message: string;
  data?: any;
  error?: any;
  environmentCheck?: {
    url: boolean;
    anonKey: boolean;
    serviceKey: boolean;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  try {
    // First check environment variables
    const environmentCheck = {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Check if we can connect to Supabase at all
    console.log('Testing basic Supabase connection...');
    let tableData;
    let tableError;
    
    try {
      const result = await supabase
        .from('_postgres_config')
        .select('*')
        .limit(1);
      
      tableData = result.data;
      tableError = result.error;
    } catch (e) {
      tableError = { message: "Couldn't connect to Supabase" };
    }

    // If we can't even connect to Supabase
    if (tableError && tableError.message === "Couldn't connect to Supabase") {
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to Supabase. Check your API credentials.',
        error: tableError,
        environmentCheck
      });
    }

    // Test if our schema tables exist
    console.log('Testing if schema tables exist...');
    let tablesExist = false;
    
    try {
      // Try to get a list of tables
      let tables;
      let tablesError;
      
      try {
        const result = await supabase.rpc('get_tables');
        tables = result.data;
        tablesError = result.error;
      } catch (e) {
        tablesError = { message: "Function get_tables doesn't exist" };
      }
      
      if (tablesError) {
        console.log('Could not check tables using RPC, trying alternative method');
        // Try alternative approach - query for the organizations table
        const { data, error } = await supabase
          .from('organizations')
          .select('id')
          .limit(1);
          
        tablesExist = !error;
      } else {
        tablesExist = tables && tables.some((t: any) => t.table_name === 'organizations');
      }
    } catch (e) {
      console.error('Error checking tables:', e);
    }

    if (!tablesExist) {
      return res.status(200).json({
        success: false,
        message: 'Connection successful but database schema is not set up.',
        data: {
          schemaNeeded: true,
          instructions: 'You need to run the schema.sql file in your Supabase SQL Editor to create the required tables.'
        },
        environmentCheck
      });
    }

    // Test 1: Check if we can connect with the regular client
    console.log('Testing regular Supabase client connection...');
    const { data: regularData, error: regularError } = await supabase
      .from('organizations')
      .select('id, domain, name')
      .limit(1);

    if (regularError) {
      console.error('Regular client error:', regularError);
      return res.status(500).json({
        success: false,
        message: 'Regular Supabase client connection failed',
        error: regularError,
        environmentCheck
      });
    }

    // Test 2: Check if we can connect with the admin client
    console.log('Testing admin Supabase client connection...');
    try {
      const adminClient = createAdminClient();
      const { data: adminData, error: adminError } = await adminClient
        .from('organizations')
        .select('id, domain, name')
        .limit(1);

      if (adminError) {
        console.error('Admin client error:', adminError);
        return res.status(500).json({
          success: false,
          message: 'Admin Supabase client connection failed',
          error: adminError,
          environmentCheck
        });
      }

      // Both tests passed
      return res.status(200).json({
        success: true,
        message: 'Supabase connection is working correctly',
        data: {
          regularClient: regularData,
          adminClient: adminData
        },
        environmentCheck
      });
    } catch (adminCreateError) {
      console.error('Error creating admin client:', adminCreateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin Supabase client',
        error: adminCreateError,
        environmentCheck
      });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error,
      environmentCheck: {
        url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }
} 