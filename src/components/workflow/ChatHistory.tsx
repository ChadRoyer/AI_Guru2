import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/router';

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  workflow_id: string;
};

type ChatHistoryProps = {
  userId: string;
  onConversationSelect?: (conversationId: string, workflowId: string) => void;
};

export default function ChatHistory({ userId, onConversationSelect }: ChatHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch conversations from Supabase
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) throw error;

        setConversations(data || []);
      } catch (error: any) {
        console.error('Error fetching conversations:', error);
        setError(error.message || 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchConversations();
    }
  }, [userId]);

  const handleConversationClick = (conversationId: string, workflowId: string) => {
    if (onConversationSelect) {
      onConversationSelect(conversationId, workflowId);
    } else {
      router.push(`/workflow-discovery?conversation_id=${conversationId}&workflow_id=${workflowId}`);
    }
  };

  const handleNewConversation = () => {
    router.push('/workflow-discovery');
  };

  if (loading) {
    return <div className="p-4">Loading conversations...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Your Conversations</h2>
        <button
          onClick={handleNewConversation}
          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
        >
          New Conversation
        </button>
      </div>
      
      {conversations.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          <p>No conversations yet.</p>
          <p className="mt-2">Start a new conversation to discover workflows.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {conversations.map((conversation) => (
            <li 
              key={conversation.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => handleConversationClick(conversation.id, conversation.workflow_id)}
            >
              <div className="flex justify-between">
                <h3 className="font-medium text-gray-900">
                  {conversation.title || 'Untitled Conversation'}
                </h3>
                <span className="text-sm text-gray-500">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Last updated: {new Date(conversation.updated_at).toLocaleTimeString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 