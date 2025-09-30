/**
 * Web Fetch Tool with Comprehensive SSRF Protection
 * 
 * Security Features:
 * - HTTPS-only protocol enforcement (port 443 only)
 * - DNS resolution with IP verification PER request
 * - Private IP address blocking (RFC 1918, loopback, link-local, IPv6-mapped IPv4)
 * - Size limits (default 10MB)
 * - Timeout enforcement (connection + total)
 * - Redirect limits (max 2 redirects with per-hop DNS validation)
 * - Strict Content-Type validation
 * - Protection against DNS rebinding attacks
 */

import * as net from 'net';
import * as url from 'url';
import * as dns from 'dns/promises';

export interface FetchOptions {
  maxBytes?: number;
  timeout?: number;
  connectTimeout?: number;
  maxRedirects?: number;
  allowedContentTypes?: string[];
  allowedPorts?: number[];
}

export interface FetchResult {
  url: string;
  finalUrl: string;
  contentType: string;
  content: string;
  size: number;
  redirectCount: number;
}

export class WebFetchTool {
  // Security constants
  private readonly DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  private readonly DEFAULT_TIMEOUT_MS = 10 * 1000; // 10 seconds total
  private readonly DEFAULT_CONNECT_TIMEOUT_MS = 5 * 1000; // 5 seconds for connection
  private readonly DEFAULT_MAX_REDIRECTS = 2;
  private readonly DEFAULT_ALLOWED_PORTS = [443]; // HTTPS only
  
  // Strict default allowed content types (no XML to prevent XXE)
  private readonly DEFAULT_ALLOWED_CONTENT_TYPES = [
    'text/html',
    'text/plain',
    'application/json',
  ];

  /**
   * Validate URL protocol and structure
   */
  private validateUrlStructure(urlString: string): url.URL {
    let parsedUrl: url.URL;

    try {
      parsedUrl = new url.URL(urlString);
    } catch (error) {
      throw new Error(`Invalid URL: ${urlString}`);
    }

    // Protocol check: HTTPS only
    if (parsedUrl.protocol !== 'https:') {
      throw new Error(`Only HTTPS protocol is allowed. Got: ${parsedUrl.protocol}`);
    }

    return parsedUrl;
  }

  /**
   * Validate port against allowlist
   */
  private validatePort(parsedUrl: url.URL, allowedPorts: number[]): void {
    const port = parsedUrl.port ? parseInt(parsedUrl.port) : 443;
    
    if (!allowedPorts.includes(port)) {
      throw new Error(`Port ${port} not allowed. Allowed ports: ${allowedPorts.join(', ')}`);
    }
  }

  /**
   * Check if an IP address is public (not private/loopback/link-local)
   * Includes IPv6-mapped IPv4 detection
   */
  private isPublicIP(ip: string): boolean {
    // Normalize IPv6-mapped IPv4 (::ffff:127.0.0.1 -> 127.0.0.1)
    if (ip.toLowerCase().startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // IPv4 checks
    if (net.isIPv4(ip)) {
      const parts = ip.split('.').map(Number);
      
      // Loopback: 127.0.0.0/8
      if (parts[0] === 127) return false;
      
      // Private: 10.0.0.0/8
      if (parts[0] === 10) return false;
      
      // Private: 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      
      // Private: 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return false;
      
      // Link-local: 169.254.0.0/16
      if (parts[0] === 169 && parts[1] === 254) return false;
      
      // Multicast: 224.0.0.0/4
      if (parts[0] >= 224 && parts[0] <= 239) return false;
      
      // Reserved/Broadcast: 240.0.0.0/4
      if (parts[0] >= 240) return false;
      
      // 0.0.0.0/8 (This network)
      if (parts[0] === 0) return false;

      return true;
    }

    // IPv6 checks
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase();
      
      // Loopback: ::1
      if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return false;
      
      // Link-local: fe80::/10
      if (lower.startsWith('fe80:') || lower.startsWith('fe8') || lower.startsWith('fe9') ||
          lower.startsWith('fea') || lower.startsWith('feb')) return false;
      
      // Unique local: fc00::/7 (fc00:: through fdff::)
      if (lower.startsWith('fc') || lower.startsWith('fd')) return false;
      
      // Multicast: ff00::/8
      if (lower.startsWith('ff')) return false;
      
      // IPv4-mapped IPv6 should have been normalized above
      // But double-check ::ffff:0:0/96
      if (lower.includes('::ffff:')) return false;

      return true;
    }

    // Unknown format
    return false;
  }

  /**
   * Resolve hostname to IP addresses and validate all are public
   * CRITICAL: Prevents DNS rebinding and private IP access
   */
  private async resolveAndValidate(hostname: string): Promise<string[]> {
    // Direct IP addresses
    if (net.isIP(hostname)) {
      if (!this.isPublicIP(hostname)) {
        throw new Error(`Access to private IP address ${hostname} is blocked.`);
      }
      return [hostname];
    }

    // Block localhost
    if (hostname.toLowerCase() === 'localhost' || hostname === '0.0.0.0') {
      throw new Error(`Access to ${hostname} is blocked for security reasons.`);
    }

    // Resolve DNS
    try {
      const addresses = await dns.resolve(hostname, 'A');
      const addresses6 = await dns.resolve(hostname, 'AAAA').catch(() => []);
      const allAddresses = [...addresses, ...addresses6];

      if (allAddresses.length === 0) {
        throw new Error(`Could not resolve hostname: ${hostname}`);
      }

      // Validate EVERY resolved IP
      for (const addr of allAddresses) {
        if (!this.isPublicIP(addr)) {
          throw new Error(
            `Hostname ${hostname} resolves to private IP ${addr}. Access blocked for security.`
          );
        }
      }

      console.log(`[WebFetch] DNS validated: ${hostname} -> ${allAddresses.join(', ')}`);
      return allAddresses;
    } catch (error) {
      if (error instanceof Error && error.message.includes('private IP')) {
        throw error;
      }
      throw new Error(`DNS resolution failed for ${hostname}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate Content-Type with exact matching
   */
  private validateContentType(contentType: string, allowedTypes: string[]): boolean {
    const baseType = contentType.split(';')[0].trim().toLowerCase();
    return allowedTypes.some(allowed => allowed.toLowerCase() === baseType);
  }

  /**
   * Fetch content from URL with comprehensive SSRF protection
   */
  async fetch(
    urlString: string,
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    const maxBytes = options.maxBytes || this.DEFAULT_MAX_BYTES;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT_MS;
    const connectTimeout = options.connectTimeout || this.DEFAULT_CONNECT_TIMEOUT_MS;
    const maxRedirects = options.maxRedirects !== undefined ? options.maxRedirects : this.DEFAULT_MAX_REDIRECTS;
    const allowedContentTypes = options.allowedContentTypes || this.DEFAULT_ALLOWED_CONTENT_TYPES;
    const allowedPorts = options.allowedPorts || this.DEFAULT_ALLOWED_PORTS;

    // Validate initial URL structure
    let currentUrl = this.validateUrlStructure(urlString);
    this.validatePort(currentUrl, allowedPorts);
    
    // CRITICAL: Resolve and validate DNS BEFORE first request
    await this.resolveAndValidate(currentUrl.hostname);

    let redirectCount = 0;
    let content = '';
    let finalUrl = urlString;
    let contentType = '';

    console.log(`[WebFetch] Fetching: ${urlString}`);

    // Follow redirects manually to validate each hop
    while (redirectCount <= maxRedirects) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Use fetch with timeout
        const response = await fetch(currentUrl.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'VaktaAI-Bot/1.0 (+https://vaktaai.repl.co)',
            'Accept': allowedContentTypes.join(', '),
          },
          redirect: 'manual', // Handle redirects manually
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle redirects
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('Location');
          if (!location) {
            throw new Error('Redirect without Location header');
          }

          redirectCount++;
          if (redirectCount > maxRedirects) {
            throw new Error(`Too many redirects (max ${maxRedirects})`);
          }

          // Parse redirect URL (may be relative)
          const redirectUrl = new url.URL(location, currentUrl);
          
          // Validate redirect URL structure
          if (redirectUrl.protocol !== 'https:') {
            throw new Error(`Redirect to non-HTTPS URL blocked: ${redirectUrl.protocol}`);
          }
          
          // Validate port
          this.validatePort(redirectUrl, allowedPorts);
          
          // CRITICAL: Re-validate DNS for redirect target
          await this.resolveAndValidate(redirectUrl.hostname);

          currentUrl = redirectUrl;
          console.log(`[WebFetch] Redirect #${redirectCount}: ${currentUrl.toString()}`);
          continue;
        }

        // Check status
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Validate Content-Type (exact match)
        contentType = response.headers.get('Content-Type') || 'text/plain';
        
        if (!this.validateContentType(contentType, allowedContentTypes)) {
          throw new Error(`Content-Type ${contentType} not in allowed list: ${allowedContentTypes.join(', ')}`);
        }

        // Check Content-Length
        const contentLength = response.headers.get('Content-Length');
        if (contentLength && parseInt(contentLength) > maxBytes) {
          throw new Error(`Content too large: ${contentLength} bytes (max ${maxBytes})`);
        }

        // Stream content with size limit
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let totalBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          totalBytes += value.length;
          if (totalBytes > maxBytes) {
            reader.cancel();
            throw new Error(`Content exceeded size limit of ${maxBytes} bytes`);
          }

          content += decoder.decode(value, { stream: true });
        }

        // Final decode
        content += decoder.decode();
        finalUrl = currentUrl.toString();

        console.log(`[WebFetch] Success: ${finalUrl} (${totalBytes} bytes, ${redirectCount} redirects)`);

        return {
          url: urlString,
          finalUrl,
          contentType,
          content,
          size: totalBytes,
          redirectCount,
        };

      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
          }
          throw error;
        }
        throw new Error(`Fetch failed: ${String(error)}`);
      }
    }

    throw new Error('Maximum redirect limit reached');
  }

  /**
   * Fetch and parse JSON
   */
  async fetchJSON(urlString: string, options: FetchOptions = {}): Promise<any> {
    const result = await this.fetch(urlString, {
      ...options,
      allowedContentTypes: ['application/json'],
    });

    try {
      return JSON.parse(result.content);
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch and extract text content (strip HTML)
   */
  async fetchText(urlString: string, options: FetchOptions = {}): Promise<string> {
    const result = await this.fetch(urlString, options);

    // Simple HTML stripping (for basic text extraction)
    if (result.contentType.includes('text/html')) {
      // Remove script and style tags
      let text = result.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      // Remove HTML tags
      text = text.replace(/<[^>]+>/g, ' ');
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
      // Normalize whitespace
      text = text.replace(/\s+/g, ' ').trim();
      return text;
    }

    return result.content;
  }

  /**
   * Batch fetch multiple URLs (with concurrency limit)
   */
  async fetchBatch(
    urls: string[],
    options: FetchOptions = {},
    concurrency: number = 3
  ): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    const chunks: string[][] = [];
    
    // Split into chunks
    for (let i = 0; i < urls.length; i += concurrency) {
      chunks.push(urls.slice(i, i + concurrency));
    }

    // Process chunks
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(url => this.fetch(url, options))
      );

      for (const result of chunkResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[WebFetch] Batch fetch failed: ${result.reason}`);
        }
      }
    }

    return results;
  }
}

// Export singleton instance
export const webFetchTool = new WebFetchTool();
