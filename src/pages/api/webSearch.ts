import type { NextApiRequest, NextApiResponse } from 'next';
import { webSearch, SearchResult } from '@/lib/search';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ results: SearchResult[] } | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Missing search query' });
  }

  try {
    const results = await webSearch(query as string);
    return res.status(200).json({ results });
  } catch (error: any) {
    console.error('Search API error:', error);
    return res.status(500).json({ error: 'Failed to perform search' });
  }
}
