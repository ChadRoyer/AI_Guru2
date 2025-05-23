import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/router';

interface OpportunitiesDisplayProps {
  workflowId: string;
}

export default function OpportunitiesDisplay({ workflowId }: OpportunitiesDisplayProps) {
  const [opportunities, setOpportunities] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchOpportunities();
  }, [workflowId]);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      // Fetch opportunities from Supabase
      const { data, error } = await supabase
        .from('workflows')
        .select('opportunities')
        .eq('id', workflowId)
        .single();

      if (error) throw error;
      setOpportunities(data.opportunities);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError('Failed to load automation opportunities.');
    } finally {
      setLoading(false);
    }
  };

  const generateOpportunities = async () => {
    setGenerating(true);
    try {
      // Call the API to generate opportunities
      const response = await fetch('/api/suggestAutomation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          workflow_id: workflowId,
          conversation_id: router.query.conversation_id
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setOpportunities(data.suggestions);
      fetchOpportunities(); // Refresh to get the saved opportunities
    } catch (error) {
      console.error('Error generating opportunities:', error);
      setError('Failed to generate automation opportunities.');
    } finally {
      setGenerating(false);
    }
  };

  const handleImplementation = () => {
    router.push(`/implementation?workflow_id=${workflowId}`);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Automation Opportunities</CardTitle>
          <CardDescription>Loading opportunities...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Automation Opportunities</CardTitle>
          <CardDescription>Error</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Automation Opportunities</CardTitle>
        <CardDescription>
          Potential automation opportunities identified in your workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        {opportunities ? (
          <div className="whitespace-pre-wrap">{opportunities}</div>
        ) : (
          <div className="text-center p-4">
            <p className="mb-4">No automation opportunities have been identified yet.</p>
            <Button 
              onClick={generateOpportunities} 
              disabled={generating}
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating suggestions...
                </>
              ) : (
                'Generate Suggestions'
              )}
            </Button>
          </div>
        )}
      </CardContent>
      {opportunities && (
        <CardFooter className="flex justify-end">
          <Button onClick={handleImplementation}>
            Implement Solutions
          </Button>
        </CardFooter>
      )}
    </Card>
  );
} 