import { NextPage } from 'next';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import ChatHistory from '@/components/workflow/ChatHistory';

const HomePage: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for user session
    const checkSession = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      }
      
      setLoading(false);
    };
    
    checkSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
      }
    );
    
    return () => {
      // Clean up the subscription
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Workflow Automation Tool</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <span>{user.email}</span>
              <button 
                onClick={handleSignOut}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link href="/login" className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 p-4">
        {loading ? (
          <div className="max-w-7xl mx-auto py-12 text-center">
            <p className="text-xl">Loading...</p>
          </div>
        ) : user ? (
          <div className="max-w-7xl mx-auto py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1">
              <ChatHistory userId={user.id} />
            </div>
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold mb-6">Welcome back!</h2>
                <p className="mb-6">
                  Continue working on your workflows or start a new one.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link 
                    href="/workflow-discovery" 
                    className="btn btn-primary block text-center"
                  >
                    Create New Workflow
                  </Link>
                  <Link 
                    href="/workflow-opportunities" 
                    className="btn btn-secondary block text-center"
                  >
                    View Opportunities
                  </Link>
                </div>
              </div>
              
              <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-100">
                <h3 className="text-xl font-semibold mb-4">How it works</h3>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Start a conversation to describe your workflow</li>
                  <li>Answer questions about your process, people involved, and systems used</li>
                  <li>Review the automatically generated workflow diagram</li>
                  <li>Get AI-powered suggestions for automation opportunities</li>
                </ol>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto py-12">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold mb-4">Map and Automate Your Workflows</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover AI-powered automation opportunities for your business processes.
                Map your workflows visually and get personalized recommendations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="card text-center p-6 bg-white rounded-lg shadow">
                <div className="text-5xl mb-4 text-blue-500">📋</div>
                <h3 className="text-xl font-semibold mb-2">Map Your Workflow</h3>
                <p className="text-gray-600 mb-4">
                  Use our guided discovery process to map out your business processes step by step.
                </p>
              </div>

              <div className="card text-center p-6 bg-white rounded-lg shadow">
                <div className="text-5xl mb-4 text-blue-500">🔍</div>
                <h3 className="text-xl font-semibold mb-2">Identify Opportunities</h3>
                <p className="text-gray-600 mb-4">
                  Our AI analyzes your workflow to find automation opportunities that can save time and reduce errors.
                </p>
              </div>

              <div className="card text-center p-6 bg-white rounded-lg shadow">
                <div className="text-5xl mb-4 text-blue-500">⚙️</div>
                <h3 className="text-xl font-semibold mb-2">Implement Solutions</h3>
                <p className="text-gray-600 mb-4">
                  Get detailed implementation guidance for each automation opportunity we identify.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-8 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
              <p className="text-lg mb-6">
                Sign in to map your first workflow and discover automation opportunities.
              </p>
              <Link href="/login" className="btn btn-primary inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-100 p-4 border-t">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          &copy; {new Date().getFullYear()} Workflow Automation Tool
        </div>
      </footer>
    </div>
  );
};

export default HomePage; 