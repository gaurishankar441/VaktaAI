/**
 * Agent Orchestrator with ReAct Loop
 * 
 * Implements the ReAct (Reasoning + Acting) pattern for agentic RAG:
 * 1. Think: Plan verification strategy
 * 2. Act: Execute tools (web search, web fetch)
 * 3. Observe: Analyze tool results
 * 4. Reflect: Update beliefs and decide next action
 * 
 * Used for claim verification in RAG responses.
 */

import { webSearchTool, SearchResult } from './tools/webSearch.js';
import { webFetchTool } from './tools/webFetch.js';
import OpenAI from 'openai';

export interface Claim {
  id: string;
  text: string;
  context?: string;
}

export interface VerificationResult {
  claim: Claim;
  status: 'Supported' | 'Contradicted' | 'Uncertain';
  confidence: number; // 0-1
  sources: Source[];
  reasoning: string;
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
  relevance: number; // 0-1
}

export interface AgentAction {
  type: 'search' | 'fetch' | 'analyze' | 'conclude';
  input: string;
  output?: any;
}

export interface AgentThought {
  reasoning: string;
  nextAction: AgentAction;
}

export class AgentOrchestrator {
  private maxIterations = 3;
  private userId: string;
  private openai: OpenAI;

  constructor(userId: string = 'system') {
    this.userId = userId;
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Extract factual claims from AI-generated text
   */
  async extractClaims(text: string): Promise<Claim[]> {
    const prompt = `Extract factual claims from the following text. A factual claim is a statement that can be verified as true or false.

Rules:
- Focus on specific, verifiable facts (dates, numbers, events, scientific facts, etc.)
- Ignore opinions, interpretations, or subjective statements
- Each claim should be standalone and verifiable
- Return claims as a JSON array

Text:
${text}

Return only valid JSON in this format:
[
  {"id": "1", "text": "The claim text", "context": "Optional context"}
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fact extraction expert. Extract only verifiable factual claims from text. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{"claims": []}';
      const parsed = JSON.parse(content);
      const claims = parsed.claims || parsed;

      console.log(`[Agent] Extracted ${claims.length} claims from text`);
      return Array.isArray(claims) ? claims : [];
    } catch (error) {
      console.error('[Agent] Claim extraction failed:', error);
      return [];
    }
  }

  /**
   * Think step: Plan verification strategy
   */
  private async think(
    claim: Claim,
    iteration: number,
    history: Array<{ action: AgentAction; observation: string }>,
    searchResults: SearchResult[]
  ): Promise<AgentThought> {
    // Build history context for the LLM
    const historyText = history.length > 0
      ? `\n\nPrevious actions and observations:\n${history
          .map((h, i) => `Action ${i + 1}: ${h.action.type} - ${h.action.input}\nObservation: ${h.observation}`)
          .join('\n\n')}`
      : '';

    // Build available URLs from search results
    const urlsText = searchResults.length > 0
      ? `\n\nAvailable URLs from search:\n${searchResults
          .slice(0, 3)
          .map((r, i) => `${i + 1}. ${r.url} - ${r.title}`)
          .join('\n')}`
      : '';

    const prompt = `You are verifying the factual claim: "${claim.text}"

Iteration: ${iteration}/${this.maxIterations}${historyText}${urlsText}

Based on the claim and previous observations, determine the best next action:
1. If you need web sources, return action "search" with a search query
2. If you have search results and want to read a source, return action "fetch" with a URL from the available URLs
3. If you have enough information to make a determination, return action "conclude"

Return JSON:
{
  "reasoning": "Your thought process based on what you've learned",
  "nextAction": {
    "type": "search" | "fetch" | "conclude",
    "input": "search query OR URL OR 'ready'"
  }
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a verification agent. Plan the next step to verify claims. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const thought = JSON.parse(content);

      console.log(`[Agent] Think (iteration ${iteration}): ${thought.reasoning}`);
      return thought as AgentThought;
    } catch (error) {
      console.error('[Agent] Think step failed:', error);
      // Default to conclude if thinking fails
      return {
        reasoning: 'Unable to plan verification strategy',
        nextAction: { type: 'conclude', input: 'uncertain' },
      };
    }
  }

  /**
   * Act step: Execute tool based on planned action
   */
  private async act(action: AgentAction): Promise<any> {
    console.log(`[Agent] Act: ${action.type} - ${action.input}`);

    try {
      switch (action.type) {
        case 'search':
          if (!webSearchTool.isAvailable()) {
            console.warn('[Agent] Web search not available');
            return [];
          }
          return await webSearchTool.search(action.input, { maxResults: 5 }, this.userId);

        case 'fetch':
          const fetchResult = await webFetchTool.fetchText(action.input, {
            maxBytes: 50000, // 50KB max for claim verification
            timeout: 8000,
          });
          return fetchResult;

        case 'analyze':
          // Analysis is done in the think step
          return action.input;

        case 'conclude':
          // Conclusion is final step
          return action.input;

        default:
          console.warn(`[Agent] Unknown action type: ${action.type}`);
          return null;
      }
    } catch (error) {
      console.error(`[Agent] Action ${action.type} failed:`, error);
      return null;
    }
  }

  /**
   * Observe step: Analyze action results
   */
  private observe(action: AgentAction, result: any): string {
    if (!result) {
      return `Action ${action.type} failed or returned no results.`;
    }

    switch (action.type) {
      case 'search':
        const searchResults = result as SearchResult[];
        return `Found ${searchResults.length} search results:\n${searchResults
          .slice(0, 3)
          .map((r, i) => `${i + 1}. ${r.title} - ${r.snippet}`)
          .join('\n')}`;

      case 'fetch':
        const text = result as string;
        const truncated = text.slice(0, 500);
        return `Fetched content (${text.length} chars): ${truncated}...`;

      default:
        return String(result);
    }
  }

  /**
   * Reflect step: Synthesize observations and determine if claim is verified
   */
  private async reflect(
    claim: Claim,
    observations: string[],
    sources: Source[]
  ): Promise<VerificationResult> {
    const prompt = `You are verifying the claim: "${claim.text}"

Observations from web research:
${observations.join('\n\n')}

Determine:
1. Status: "Supported" (evidence confirms), "Contradicted" (evidence refutes), or "Uncertain" (insufficient/mixed evidence)
2. Confidence: 0.0 to 1.0
3. Reasoning: Brief explanation

Return JSON:
{
  "status": "Supported" | "Contradicted" | "Uncertain",
  "confidence": 0.0-1.0,
  "reasoning": "Your explanation"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a fact-checking expert. Assess claim verification based on evidence. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const assessment = JSON.parse(content);

      console.log(
        `[Agent] Reflect: ${assessment.status} (confidence: ${assessment.confidence})`
      );

      return {
        claim,
        status: assessment.status || 'Uncertain',
        confidence: assessment.confidence || 0.5,
        sources,
        reasoning: assessment.reasoning || 'Unable to determine verification status',
      };
    } catch (error) {
      console.error('[Agent] Reflect step failed:', error);
      return {
        claim,
        status: 'Uncertain',
        confidence: 0.0,
        sources,
        reasoning: 'Verification process failed',
      };
    }
  }

  /**
   * Verify a single claim using ReAct loop
   */
  async verifyClaim(claim: Claim): Promise<VerificationResult> {
    console.log(`[Agent] Starting verification for claim: "${claim.text}"`);

    const history: Array<{ action: AgentAction; observation: string }> = [];
    const observations: string[] = [];
    const sources: Source[] = [];
    const searchResults: SearchResult[] = [];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;

      // THINK: Plan next action (with stateful history)
      const thought = await this.think(claim, iteration, history, searchResults);

      // Check if we should conclude
      if (thought.nextAction.type === 'conclude') {
        break;
      }

      // ACT: Execute action
      const result = await this.act(thought.nextAction);

      // OBSERVE: Analyze results
      const observation = this.observe(thought.nextAction, result);
      observations.push(observation);

      // Store in history for next iteration
      history.push({
        action: thought.nextAction,
        observation,
      });

      // Collect sources from search results
      if (thought.nextAction.type === 'search' && result) {
        const newSearchResults = result as SearchResult[];
        searchResults.push(...newSearchResults);
        
        sources.push(
          ...newSearchResults.slice(0, 3).map((r) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            relevance: r.score || 0.5,
          }))
        );
      }

      // Add source from fetch action
      if (thought.nextAction.type === 'fetch' && result && typeof result === 'string') {
        const url = thought.nextAction.input;
        const existingSource = searchResults.find(sr => sr.url === url);
        
        if (existingSource && !sources.find(s => s.url === url)) {
          sources.push({
            url: existingSource.url,
            title: existingSource.title,
            snippet: result.slice(0, 200),
            relevance: existingSource.score || 0.7,
          });
        }
      }

      console.log(`[Agent] Observation (iteration ${iteration}): ${observation.slice(0, 150)}...`);
    }

    // REFLECT: Make final assessment (limit to top 5 sources)
    const topSources = sources
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5);
    
    const verificationResult = await this.reflect(claim, observations, topSources);

    console.log(
      `[Agent] Verification complete: ${verificationResult.status} (${verificationResult.confidence})`
    );
    return verificationResult;
  }

  /**
   * Verify multiple claims in batch
   */
  async verifyClaims(claims: Claim[]): Promise<VerificationResult[]> {
    console.log(`[Agent] Verifying ${claims.length} claims`);

    const results: VerificationResult[] = [];

    // Verify claims sequentially to respect rate limits
    for (const claim of claims) {
      const result = await this.verifyClaim(claim);
      results.push(result);
    }

    return results;
  }

  /**
   * Verify AI response: extract claims and verify them
   */
  async verifyResponse(responseText: string): Promise<{
    claims: Claim[];
    verifications: VerificationResult[];
    summary: string;
  }> {
    console.log(`[Agent] Verifying AI response (${responseText.length} chars)`);

    // Extract claims
    const claims = await this.extractClaims(responseText);

    if (claims.length === 0) {
      return {
        claims: [],
        verifications: [],
        summary: 'No verifiable factual claims detected in response.',
      };
    }

    // Verify claims
    const verifications = await this.verifyClaims(claims);

    // Generate summary
    const supported = verifications.filter((v) => v.status === 'Supported').length;
    const contradicted = verifications.filter((v) => v.status === 'Contradicted').length;
    const uncertain = verifications.filter((v) => v.status === 'Uncertain').length;

    const summary = `Verified ${claims.length} claims: ${supported} supported, ${contradicted} contradicted, ${uncertain} uncertain.`;

    console.log(`[Agent] Verification summary: ${summary}`);

    return { claims, verifications, summary };
  }
}
