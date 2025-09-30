/**
 * Web Search Tool with SSRF Protection
 * 
 * Provides secure web search capabilities with:
 * - Environment-gated API access
 * - Rate limiting and caching
 * - Multiple provider support (Tavily, Bing, SerpAPI)
 * - Strict input validation
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface SearchOptions {
  maxResults?: number;
  region?: string;
  language?: string;
}

// Simple in-memory cache (10-30 minutes TTL)
interface CacheEntry {
  results: SearchResult[];
  timestamp: number;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

export class WebSearchTool {
  private provider: 'tavily' | 'bing' | 'serpapi' | null = null;
  private apiKey: string | null = null;
  private requestCount: Map<string, { count: number; resetAt: number }> = new Map();
  
  // Rate limiting: 30 requests per minute per user
  private readonly RATE_LIMIT = 30;
  private readonly RATE_WINDOW_MS = 60 * 1000;

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    // Try Tavily first (recommended for agentic RAG)
    if (process.env.TAVILY_API_KEY) {
      this.provider = 'tavily';
      this.apiKey = process.env.TAVILY_API_KEY;
      console.log('[WebSearch] Using Tavily provider');
      return;
    }

    // Fallback to Bing
    if (process.env.BING_SEARCH_KEY || process.env.WEB_SEARCH_KEY) {
      this.provider = 'bing';
      this.apiKey = process.env.BING_SEARCH_KEY || process.env.WEB_SEARCH_KEY || null;
      console.log('[WebSearch] Using Bing provider');
      return;
    }

    // Fallback to SerpAPI
    if (process.env.SERP_API_KEY) {
      this.provider = 'serpapi';
      this.apiKey = process.env.SERP_API_KEY;
      console.log('[WebSearch] Using SerpAPI provider');
      return;
    }

    console.warn('[WebSearch] No web search provider configured. Web search disabled.');
  }

  /**
   * Check if web search is available
   */
  isAvailable(): boolean {
    return this.provider !== null && this.apiKey !== null;
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.requestCount.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      // Reset window
      this.requestCount.set(userId, {
        count: 1,
        resetAt: now + this.RATE_WINDOW_MS,
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT) {
      console.warn(`[WebSearch] Rate limit exceeded for user ${userId}`);
      return false;
    }

    userLimit.count++;
    return true;
  }

  /**
   * Get from cache if available
   */
  private getCached(cacheKey: string): SearchResult[] | null {
    const entry = searchCache.get(cacheKey);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      searchCache.delete(cacheKey);
      return null;
    }

    console.log(`[WebSearch] Cache hit for: ${cacheKey}`);
    return entry.results;
  }

  /**
   * Store in cache
   */
  private setCache(cacheKey: string, results: SearchResult[]): void {
    const now = Date.now();
    searchCache.set(cacheKey, {
      results,
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
    });
  }

  /**
   * Search the web for information
   */
  async search(
    query: string,
    options: SearchOptions = {},
    userId: string = 'system'
  ): Promise<SearchResult[]> {
    // Validation
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    if (query.length > 500) {
      throw new Error('Search query too long (max 500 characters)');
    }

    if (!this.isAvailable()) {
      throw new Error('Web search is not configured. Please set WEB_SEARCH_KEY environment variable.');
    }

    // Rate limiting
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Please try again in a minute.');
    }

    // Check cache
    const cacheKey = `${query}:${options.maxResults || 10}:${options.region || 'us'}`;
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    // Perform search based on provider
    let results: SearchResult[];
    try {
      switch (this.provider) {
        case 'tavily':
          results = await this.searchTavily(query, options);
          break;
        case 'bing':
          results = await this.searchBing(query, options);
          break;
        case 'serpapi':
          results = await this.searchSerpAPI(query, options);
          break;
        default:
          throw new Error('No search provider available');
      }

      // Cache results
      this.setCache(cacheKey, results);
      
      console.log(`[WebSearch] Found ${results.length} results for: "${query}"`);
      return results;
    } catch (error) {
      console.error('[WebSearch] Search failed:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Tavily Search (recommended for agentic RAG)
   */
  private async searchTavily(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options.maxResults || 10;

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        query: query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.results || []).map((result: any) => ({
      title: result.title || '',
      url: result.url || '',
      snippet: result.content || '',
      score: result.score,
    }));
  }

  /**
   * Bing Search
   */
  private async searchBing(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options.maxResults || 10;
    const market = options.region ? `${options.region}-${options.language || 'US'}` : 'en-US';

    const url = new URL('https://api.bing.microsoft.com/v7.0/search');
    url.searchParams.set('q', query);
    url.searchParams.set('count', maxResults.toString());
    url.searchParams.set('mkt', market);

    const response = await fetch(url.toString(), {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey!,
      },
    });

    if (!response.ok) {
      throw new Error(`Bing API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.webPages?.value || []).map((result: any) => ({
      title: result.name || '',
      url: result.url || '',
      snippet: result.snippet || '',
    }));
  }

  /**
   * SerpAPI Search
   */
  private async searchSerpAPI(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const maxResults = options.maxResults || 10;
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', this.apiKey!);
    url.searchParams.set('num', maxResults.toString());
    url.searchParams.set('gl', options.region || 'us');
    url.searchParams.set('hl', options.language || 'en');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return (data.organic_results || []).map((result: any) => ({
      title: result.title || '',
      url: result.link || '',
      snippet: result.snippet || '',
      score: result.position ? 1 / result.position : undefined,
    }));
  }

  /**
   * Clear cache (for testing or manual cache invalidation)
   */
  clearCache(): void {
    searchCache.clear();
    console.log('[WebSearch] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: number } {
    return {
      size: searchCache.size,
      entries: Array.from(searchCache.values()).length,
    };
  }
}

// Export singleton instance
export const webSearchTool = new WebSearchTool();
