import { NextPage } from 'next';
import { useRouter } from 'next/router';
import WorkflowDiscovery from '@/components/workflow/WorkflowDiscovery';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Head from 'next/head';

const WorkflowDiscoveryPage: NextPage = () => {
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
      } else {
        // Redirect to login if no session
        router.push('/login');
      }
      
      setLoading(false);
    };
    
    checkSession();
  }, [router]);

  return (
    <>
      <Head>
        <title>Workflow Discovery | Workflow Automation Tool</title>
        <meta name="description" content="Map your business workflow and get automation suggestions" />
      </Head>

      <div className="min-h-screen flex flex-col">
        <header className="bg-blue-600 text-white p-4">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Workflow Discovery</h1>
            <div className="flex items-center space-x-4">
              <a href="/" className="text-white hover:text-blue-100">
                Home
              </a>
              {user && (
                <span className="text-sm">{user.email}</span>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 bg-gray-50">
          {loading ? (
            <div className="max-w-7xl mx-auto py-12 text-center">
              <p className="text-xl">Loading...</p>
            </div>
          ) : (
            <WorkflowDiscovery />
          )}
        </main>

        <footer className="bg-gray-100 p-4 border-t">
          <div className="max-w-7xl mx-auto text-center text-gray-500">
            &copy; {new Date().getFullYear()} Workflow Automation Tool
          </div>
        </footer>
      </div>
    </>
  );
};

export default WorkflowDiscoveryPage; 