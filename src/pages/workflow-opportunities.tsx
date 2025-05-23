import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import OpportunitiesDisplay from '@/components/workflow/OpportunitiesDisplay';
import ReactFlow, { ReactFlowProvider, Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';
import Link from 'next/link';

export default function WorkflowOpportunities() {
  const router = useRouter();
  const { workflow_id, conversation_id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState<any>(null);
  const [diagramData, setDiagramData] = useState<{ nodes: any[]; edges: any[]; } | null>(null);

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
      setDiagramData(data.diagram_data);
    } catch (error) {
      console.error('Error fetching workflow:', error);
    } finally {
      setLoading(false);
    }
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
        <p className="mb-6">Please select a workflow to view its automation opportunities.</p>
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
                  href={`/workflow-discovery?conversation_id=${conversation_id}&workflow_id=${workflow_id}`}
                  className="text-blue-600 hover:underline"
                >
                  Edit Workflow
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold">Workflow Diagram</h3>
                </div>
                <div className="h-96">
                  {diagramData && (
                    <ReactFlowProvider>
                      <ReactFlow
                        nodes={diagramData.nodes}
                        edges={diagramData.edges}
                        fitView
                        attributionPosition="bottom-right"
                      >
                        <Controls />
                        <MiniMap />
                        <Background color="#aaa" gap={16} />
                      </ReactFlow>
                    </ReactFlowProvider>
                  )}
                </div>
              </div>

              <div>
                <OpportunitiesDisplay workflowId={workflow_id as string} />
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