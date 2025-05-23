export type SearchResult = {
  title: string;
  link: string;
  snippet: string;
};

export async function webSearch(query: string, numResults = 5): Promise<SearchResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY is not defined in environment variables');
  }

  const params = new URLSearchParams({
    q: query,
    api_key: process.env.SERPAPI_KEY,
    num: String(numResults),
  });

  const response = await fetch(`https://serpapi.com/search.json?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Search API request failed with status ${response.status}`);
  }

  const data = await response.json();

  // Extract organic search results if available
  const results = (data.organic_results || []).slice(0, numResults).map((item: any) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
  }));

  return results as SearchResult[];
}
