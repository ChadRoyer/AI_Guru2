import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ImplementationPage() {
  const router = useRouter();
  const { workflow_id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for user session
    const checkSession = async () => {
      // Check for Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Redirect to login if no session
        router.push('/login');
        return;
      }
      
      setUser(session.user);
      
      // Only fetch workflow if workflow_id is available
      if (workflow_id) {
        fetchWorkflow(workflow_id as string);
      }
    };
    
    checkSession();
  }, [router, workflow_id]);

  const fetchWorkflow = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      setWorkflow(data);
      setOpportunities(data.opportunities);
    } catch (error) {
      console.error('Error fetching workflow:', error);
      setError('Failed to load workflow data.');
    } finally {
      setLoading(false);
    }
  };

  const generateImplementationGuidance = async (opportunityDescription: string) => {
    if (!opportunityDescription) return;
    
    setSelectedOpportunity(opportunityDescription);
    setLoadingGuidance(true);
    setError(null);
    
    try {
      // Call the API to generate implementation guidance
      const response = await fetch('/api/generateImplementationGuidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          opportunity: opportunityDescription,
          workflow_id: workflow_id
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setGuidance(data.guidance);
    } catch (error) {
      console.error('Error generating implementation guidance:', error);
      setError('Failed to generate implementation guidance.');
    } finally {
      setLoadingGuidance(false);
    }
  };

  // Extract individual opportunities from the markdown table
  const parseOpportunities = (opportunitiesText: string) => {
    if (!opportunitiesText) return [];
    
    const rows = opportunitiesText.split('\n').filter(row => row.trim().startsWith('|') && !row.includes('---'));
    
    return rows.map(row => {
      const cells = row.split('|').filter(cell => cell.trim() !== '');
      if (cells.length >= 3) {
        return {
          step: cells[0].trim(),
          title: cells[1].trim(),
          description: cells[2].trim()
        };
      }
      return null;
    }).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!workflow_id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">No Workflow Selected</h1>
        <p className="mb-6">Please select a workflow to view implementation guidance.</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Workflow Automation Tool</h1>
          <div className="flex items-center space-x-4">
            {user && <span>{user.email}</span>}
            <Link href="/" className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-gray-100">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-7xl mx-auto">
        {workflow && (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{workflow.title || 'Untitled Workflow'}</h2>
              <div className="flex space-x-4">
                <Link 
                  href={`/workflow-opportunities?workflow_id=${workflow_id}`}
                  className="text-blue-600 hover:underline"
                >
                  Back to Opportunities
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Guidance</CardTitle>
                    <CardDescription>
                      Select an opportunity to get detailed implementation guidance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {opportunities ? (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Select an opportunity:</h3>
                        <div className="space-y-4">
                          {parseOpportunities(opportunities).map((opportunity, index) => (
                            opportunity && (
                              <div 
                                key={index}
                                className={`p-4 border rounded cursor-pointer hover:bg-gray-50 ${
                                  selectedOpportunity === opportunity.description ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                }`}
                                onClick={() => generateImplementationGuidance(opportunity.description)}
                              >
                                <h4 className="font-medium">{opportunity.title}</h4>
                                <p className="text-sm text-gray-500 mt-1">For: {opportunity.step}</p>
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-center py-4">
                        No opportunities have been identified for this workflow.
                        <br />
                        <Link
                          href={`/workflow-opportunities?workflow_id=${workflow_id}`}
                          className="text-blue-600 hover:underline mt-2 inline-block"
                        >
                          Generate opportunities first
                        </Link>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Implementation Guide</CardTitle>
                    <CardDescription>
                      Step-by-step guidance for implementing the selected opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingGuidance ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : error ? (
                      <div className="p-4 bg-red-50 text-red-600 rounded">
                        {error}
                      </div>
                    ) : guidance ? (
                      <div className="prose max-w-none">
                        <div className="whitespace-pre-wrap">{guidance}</div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        Select an opportunity from the left to view implementation guidance.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="bg-gray-100 p-4 border-t">
        <div className="max-w-7xl mx-auto text-center text-gray-500">
          &copy; {new Date().getFullYear()} Workflow Automation Tool
        </div>
      </footer>
    </div>
  );
} 