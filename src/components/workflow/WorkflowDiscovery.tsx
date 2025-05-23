'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import ReactFlow, { ReactFlowProvider, Background, Controls, MiniMap } from 'reactflow';
import 'reactflow/dist/style.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface WorkflowData {
  title: string;
  start_event: string;
  end_event: string;
  steps: Array<any>;
  people: Array<any>;
  systems: Array<any>;
  pain_points: Array<string>;
}

const WorkflowDiscovery = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [diagramData, setDiagramData] = useState<{ nodes: any[]; edges: any[]; } | null>(null);
  const [workflowComplete, setWorkflowComplete] = useState(false);
  const [showDiagram, setShowDiagram] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Get user session and query parameters
  useEffect(() => {
    const { conversation_id, workflow_id } = router.query;
    
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserId(session.user.id);
        
        // If we have conversation and workflow IDs from the URL, load that conversation
        if (conversation_id && workflow_id) {
          setConversationId(conversation_id as string);
          setWorkflowId(workflow_id as string);
          loadConversation(conversation_id as string, workflow_id as string);
        } else {
          // Otherwise start a new conversation
          startConversation(session.user.id);
        }
      } else {
        // Redirect to login if no session
        router.push('/login');
      }
    };
    
    checkSession();
  }, [router]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load an existing conversation
  const loadConversation = async (conversationId: string, workflowId: string) => {
    setIsLoading(true);
    try {
      // Fetch messages for this conversation
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (messageError) throw messageError;
      
      // Fetch workflow data
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();
        
      if (workflowError) throw workflowError;
      
      // Filter out system messages for display
      const displayMessages = messageData
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        
      setMessages(displayMessages);
      
      // Check if workflow is complete and has diagram data
      if (workflowData.workflow_data && workflowData.diagram_data) {
        setWorkflowData(workflowData.workflow_data);
        setDiagramData(workflowData.diagram_data);
        setWorkflowComplete(true);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start a new conversation
  const startConversation = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/workflowDiscovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'I want to map a business workflow.',
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start conversation');
      }

      const data = await response.json();
      
      // Add the assistant's message to displayed messages
      setMessages([
        {
          role: 'assistant',
          content: data.message,
        },
      ]);
      
      setConversationId(data.conversation_id);
      setWorkflowId(data.workflow_id);
      
      // Update URL to include conversation and workflow IDs
      router.push({
        pathname: router.pathname,
        query: { 
          conversation_id: data.conversation_id,
          workflow_id: data.workflow_id
        }
      }, undefined, { shallow: true });
    } catch (error) {
      console.error('Error starting conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the handleSendMessage function
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    if (!conversationId || !userId) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/workflowDiscovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_id: conversationId,
          workflow_id: workflowId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add the assistant's response to displayed messages
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
      
      // Check if the workflow is complete
      if (data.is_complete && data.workflow_id) {
        setWorkflowComplete(true);
        
        // Fetch the updated workflow data with diagram
        const { data: workflow, error } = await supabase
          .from('workflows')
          .select('workflow_data, diagram_data')
          .eq('id', data.workflow_id)
          .single();
          
        if (!error && workflow) {
          setWorkflowData(workflow.workflow_data);
          setDiagramData(workflow.diagram_data);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, there was an error processing your request.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to navigate to the AI opportunities page
  const viewOpportunities = () => {
    if (workflowId && conversationId) {
      // Navigate to the opportunities page with the IDs
      router.push({
        pathname: '/workflow-opportunities',
        query: { 
          workflow_id: workflowId,
          conversation_id: conversationId,
        },
      });
    }
  };

  // Toggle diagram view
  const toggleDiagram = () => {
    setShowDiagram(!showDiagram);
  };

  // Function to format message content with Markdown
  const formatMessage = (content: string) => {
    // Simple Markdown formatting for display
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {showDiagram && diagramData && (
        <div className="h-96 border rounded mb-4">
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
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user' ? 'bg-blue-100 ml-auto' : 'bg-gray-100'
            } max-w-3xl`}
          >
            <div
              dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
            />
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-lg bg-gray-100 max-w-3xl">
            <div className="flex space-x-2">
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Show workflow actions if workflow is complete */}
      {workflowComplete && (
        <div className="bg-green-100 p-4 border-t border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-green-800">Workflow mapping complete!</h3>
              <p className="text-green-700 text-sm">
                Your workflow has been mapped successfully. 
                {workflowData?.title && <span className="font-medium"> "{workflowData.title}"</span>}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={toggleDiagram}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showDiagram ? 'Hide Diagram' : 'View Diagram'}
              </button>
              <button
                onClick={viewOpportunities}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                View AI Opportunities
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 p-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || !conversationId}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-blue-300"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default WorkflowDiscovery; 