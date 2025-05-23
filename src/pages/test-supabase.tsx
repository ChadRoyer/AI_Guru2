import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function TestSupabasePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/testSupabase');
      const data = await response.json();
      
      console.log('Test response:', data);
      setResult(data);
    } catch (err: any) {
      console.error('Error testing Supabase connection:', err);
      setError(err.message || 'An error occurred during the test');
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setAuthError('Email is required');
      return;
    }
    
    setAuthLoading(true);
    setAuthResult(null);
    setAuthError(null);

    try {
      const response = await fetch('/api/testAuth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      console.log('Auth test response:', data);
      setAuthResult(data);
    } catch (err: any) {
      console.error('Error testing Supabase auth:', err);
      setAuthError(err.message || 'An error occurred during the auth test');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Test Supabase Connection</title>
      </Head>

      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Supabase Connection Test</h1>
          <Link href="/" className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100">
            Home
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Supabase Connection</h2>
          <p className="mb-4">
            Click the button below to test if the application can connect to Supabase properly.
          </p>
          <button
            onClick={testConnection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>

        {result && (
          <div className={`bg-white rounded-lg shadow-md p-6 mb-6 ${result.success ? 'border-green-500' : 'border-red-500'} border-2`}>
            <h2 className="text-xl font-semibold mb-4">
              {result.success ? '✅ Test Passed' : '❌ Test Failed'}
            </h2>
            <p className="mb-4">{result.message}</p>
            
            {result.data && result.data.schemaNeeded && (
              <div className="mb-6 bg-yellow-50 p-4 border border-yellow-300 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Database Schema Setup Required</h3>
                <p className="mb-2">Your Supabase connection is working, but the database schema has not been set up yet.</p>
                <ol className="list-decimal pl-5 mb-3 space-y-1">
                  <li>Log in to your Supabase dashboard</li>
                  <li>Go to the SQL Editor section</li>
                  <li>Create a new query</li>
                  <li>Copy and paste the contents of your schema.sql file</li>
                  <li>Run the query to create all tables and set up security policies</li>
                  <li>Come back and run this test again to verify the setup</li>
                </ol>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600">View Schema SQL</summary>
                  <pre className="mt-2 p-3 bg-gray-800 text-gray-100 rounded overflow-auto text-xs max-h-96">
{`-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain TEXT UNIQUE,
  name TEXT
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  org_id UUID REFERENCES public.organizations(id),
  email TEXT,
  company_name TEXT
);

-- Workflows table
CREATE TABLE IF NOT EXISTS public.workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES public.organizations(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  start_event TEXT,
  end_event TEXT,
  workflow_data JSONB,
  diagram_data JSONB,
  opportunities TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES public.workflows(id),
  user_id UUID REFERENCES auth.users(id),
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id),
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;`}
                  </pre>
                </details>
              </div>
            )}
            
            {result.data && !result.data.schemaNeeded && (
              <div className="mb-4">
                <h3 className="font-medium mb-2">Data:</h3>
                <pre className="bg-gray-100 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
            
            {result.error && (
              <div className="mb-4">
                <h3 className="font-medium mb-2 text-red-600">Error:</h3>
                <pre className="bg-red-50 text-red-800 p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(result.error, null, 2)}
                </pre>
              </div>
            )}
            
            {result.environmentCheck && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium mb-2">Environment Check:</h3>
                <ul className="space-y-1">
                  <li>
                    <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{' '}
                    {result.environmentCheck.url ? '✅ Set' : '❌ Not set'}
                  </li>
                  <li>
                    <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{' '}
                    {result.environmentCheck.anonKey ? '✅ Set' : '❌ Not set'}
                  </li>
                  <li>
                    <strong>SUPABASE_SERVICE_ROLE_KEY:</strong>{' '}
                    {result.environmentCheck.serviceKey ? '✅ Set' : '❌ Not set'}
                  </li>
                </ul>
              </div>
            )}
          </div>
        )}

        {error && !result && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-red-700">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Supabase Authentication</h2>
          <p className="mb-4">
            Enter your email below to test Supabase authentication (a magic link will be sent to your email).
          </p>
          
          <form onSubmit={testAuth} className="mb-4">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="your@email.com"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={authLoading || !email}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {authLoading ? 'Testing Auth...' : 'Test Authentication'}
            </button>
          </form>
          
          {authResult && (
            <div className={`${authResult.success ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'} border-2 rounded-lg p-4 mt-4`}>
              <h3 className="font-medium mb-2">
                {authResult.success ? '✅ Auth Test Passed' : '❌ Auth Test Failed'}
              </h3>
              <p className="mb-2">{authResult.message}</p>
              
              {authResult.data && (
                <div className="mb-2">
                  <pre className="bg-white p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(authResult.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {authResult.error && (
                <div>
                  <h4 className="font-medium text-red-600 text-sm">Error Details:</h4>
                  <pre className="bg-white p-2 rounded text-sm overflow-auto max-h-40">
                    {JSON.stringify(authResult.error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          
          {authError && !authResult && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mt-4">
              <h3 className="font-medium mb-2 text-red-700">Auth Error</h3>
              <p className="text-red-700">{authError}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2">
            <p>
              <strong>NEXT_PUBLIC_SUPABASE_URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}
              {process.env.NEXT_PUBLIC_SUPABASE_URL && (
                <span className="ml-2 text-xs text-gray-500">
                  ({process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...)
                </span>
              )}
            </p>
            <p>
              <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong>{' '}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && (
                <span className="ml-2 text-xs text-gray-500">
                  (starts with {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 5)}...)
                </span>
              )}
            </p>
            <p>
              <strong>NEXT_PUBLIC_URL:</strong>{' '}
              {process.env.NEXT_PUBLIC_URL ? process.env.NEXT_PUBLIC_URL : 'Not set (will default to localhost)'}
            </p>
            <p>
              <strong>Environment:</strong> {process.env.NODE_ENV}
            </p>
          </div>
        </div>
      </main>

      <footer className="bg-gray-100 p-4 border-t">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          &copy; {new Date().getFullYear()} Workflow Automation Tool
        </div>
      </footer>
    </div>
  );
} 