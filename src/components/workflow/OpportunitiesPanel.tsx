'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface OpportunitiesPanelProps {
  workflowData: any;
}

const OpportunitiesPanel = ({ workflowData }: OpportunitiesPanelProps) => {
  const [opportunities, setOpportunities] = useState<string | null>(null);
  const [implementationGuidance, setImplementationGuidance] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch AI opportunities
  const identifyOpportunities = async () => {
    setIsLoading(true);
    setError(null);
    setOpportunities(null);
    setImplementationGuidance(null);
    
    try {
      const response = await fetch('/api/identifyOpportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflowData }),
      });

      if (!response.ok) {
        throw new Error('Failed to identify opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities);
    } catch (error) {
      console.error('Error identifying opportunities:', error);
      setError('Failed to identify opportunities. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to request implementation guidance for a specific opportunity
  const requestImplementationGuidance = async (opportunityDescription: string) => {
    setIsGuidanceLoading(true);
    setError(null);
    setImplementationGuidance(null);
    setSelectedOpportunity(opportunityDescription);
    
    try {
      const response = await fetch('/api/generateImplementationGuidance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ opportunityDescription }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate implementation guidance');
      }

      const data = await response.json();
      setImplementationGuidance(data.guidance);
    } catch (error) {
      console.error('Error generating implementation guidance:', error);
      setError('Failed to generate implementation guidance. Please try again later.');
    } finally {
      setIsGuidanceLoading(false);
    }
  };

  // Function to extract opportunities from markdown table for easier interaction
  const extractOpportunities = (markdownTable: string): { description: string }[] => {
    try {
      // This is a simplified approach - a real implementation would need more robust parsing
      const rows = markdownTable.split('\n').filter(row => row.trim().startsWith('|') && !row.includes('---'));
      
      // Skip the header row
      const dataRows = rows.slice(1);
      
      return dataRows.map(row => {
        const columns = row.split('|').filter(Boolean);
        // The description is the 3rd column in our table format
        return { description: columns[2]?.trim() || '' };
      });
    } catch (error) {
      console.error('Error parsing opportunities table:', error);
      return [];
    }
  };

  return (
    <div className="flex flex-col space-y-6 p-4 bg-white rounded-lg shadow">
      <div>
        <h2 className="text-xl font-semibold mb-2">AI & Automation Opportunities</h2>
        <p className="text-gray-600 mb-4">
          Identify potential AI and automation opportunities for your workflow.
        </p>
        <button
          onClick={identifyOpportunities}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Identifying Opportunities...' : 'Identify Opportunities'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {opportunities && (
        <div className="opportunities-table">
          <h3 className="text-lg font-medium mb-2">Identified Opportunities</h3>
          <div className="markdown-content overflow-x-auto">
            <ReactMarkdown>{opportunities}</ReactMarkdown>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Get Implementation Guidance</h3>
            <p className="text-gray-600 mb-4">
              Select an opportunity to get detailed implementation guidance:
            </p>
            <div className="space-y-2">
              {extractOpportunities(opportunities).map((opportunity, index) => (
                <button
                  key={index}
                  onClick={() => requestImplementationGuidance(opportunity.description)}
                  className="block w-full text-left p-3 border rounded hover:bg-gray-50"
                >
                  {opportunity.description.length > 100 
                    ? `${opportunity.description.substring(0, 100)}...` 
                    : opportunity.description}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isGuidanceLoading && (
        <div className="p-4 bg-gray-100 rounded">
          <div className="flex space-x-2 justify-center">
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="h-2 w-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
          </div>
          <p className="text-center mt-2">Generating implementation guidance...</p>
        </div>
      )}

      {implementationGuidance && (
        <div className="implementation-guidance p-4 bg-blue-50 rounded">
          <h3 className="text-lg font-medium mb-2">Implementation Guidance Prompt</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use this prompt with ChatGPT or Claude to get detailed implementation instructions:
          </p>
          <div className="bg-white p-4 rounded border">
            <ReactMarkdown>{implementationGuidance}</ReactMarkdown>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(implementationGuidance);
            }}
            className="mt-4 px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
          >
            Copy to clipboard
          </button>
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPanel; 