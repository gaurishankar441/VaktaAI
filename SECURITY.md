# Security Policy

## Web Fetch SSRF Protection

VaktaAI implements comprehensive Server-Side Request Forgery (SSRF) protection for its agentic RAG system.

### Threat Model

The agentic RAG system can make HTTP requests to external sources for claim verification. Without proper controls, this could be exploited to:
- Access internal services (cloud metadata, databases, admin panels)
- Scan internal networks
- Bypass firewalls and access controls
- Launch attacks against third parties

### SSRF Protection Measures

#### 1. Protocol Enforcement
- **HTTPS Only**: All external requests must use HTTPS protocol
- **Port Allowlist**: Only port 443 is allowed by default (configurable)
- **No HTTP**: HTTP protocol is blocked to prevent downgrade attacks

#### 2. DNS Resolution with IP Pinning

**Critical Feature**: Eliminates DNS rebinding TOCTOU (Time-of-Check-Time-of-Use) attacks

- Pre-request DNS resolution validates ALL resolved IPs before connection
- Custom undici Agent with controlled DNS lookup returns ONLY validated IPs
- Per-hop validation: Each redirect triggers fresh DNS resolution and IP re-pinning
- No trust in external DNS between validation and connection

#### 3. Private IP Blocking

The following IP ranges are blocked:

**IPv4:**
- `0.0.0.0/8` - This network
- `10.0.0.0/8` - Private (RFC 1918)
- `127.0.0.0/8` - Loopback
- `169.254.0.0/16` - Link-local
- `172.16.0.0/12` - Private (RFC 1918)
- `192.168.0.0/16` - Private (RFC 1918)
- `100.64.0.0/10` - CGNAT (Carrier-Grade NAT)
- `192.0.0.0/24` - Special use
- `198.18.0.0/15` - Benchmarking
- `224.0.0.0/4` - Multicast
- `240.0.0.0/4` - Reserved/Broadcast

**IPv6:**
- `::1/128` - Loopback
- `fe80::/10` - Link-local
- `fc00::/7` - Unique local addresses (ULA)
- `ff00::/8` - Multicast
- `::ffff:0:0/96` - IPv6-mapped IPv4 (normalized before validation)

**Special Cases:**
- `localhost` - Explicitly blocked
- IPv6-mapped IPv4 addresses (e.g., `::ffff:127.0.0.1`) are normalized to IPv4 and validated

#### 4. Size and Timeout Limits

- **Max Size**: 10MB per request (configurable via `FETCH_MAX_BYTES`)
- **Total Timeout**: 10 seconds (configurable via `FETCH_TIMEOUT_MS`)
- **Connect Timeout**: 5 seconds (configurable via `FETCH_CONNECT_TIMEOUT_MS`)
- **Streaming**: Content is streamed with size enforcement during download

#### 5. Redirect Handling

- **Max Redirects**: 2 redirects allowed
- **Per-Hop Validation**: Each redirect URL undergoes full SSRF validation
- **Manual Following**: Redirects are followed manually to validate each hop
- **Agent Cleanup**: Old agent disposed and new pinned agent created per redirect

#### 6. Content-Type Validation

- **Exact Matching**: Content-Type headers validated with exact matching (no substring matching)
- **Default Allowlist**: `text/html`, `text/plain`, `application/json`
- **No XML**: XML types excluded by default to prevent XXE attacks
- **Configurable**: Allowlist can be customized per request

### Implementation Details

**Location**: `server/agent/tools/webFetch.ts`

**Key Components:**
1. `validateUrlStructure()` - Protocol and port validation
2. `isPublicIP()` - Comprehensive private IP detection with IPv6-mapped IPv4 normalization
3. `resolveAndValidate()` - DNS resolution with validation of ALL resolved IPs
4. `createPinnedAgent()` - Undici Agent with custom lookup enforcing IP pinning
5. `fetch()` - Main fetch method with per-hop validation and cleanup

**Failover**: If a validated IP fails to connect, the agent automatically tries the next validated IP.

### Rate Limiting

Web search is rate-limited to prevent abuse:
- **Limit**: 30 requests per minute per user
- **Window**: 60 seconds
- **Enforcement**: In-memory per-user tracking in `webSearchTool`

### Caching

Web search results are cached to reduce API calls:
- **TTL**: 20 minutes
- **Scope**: Per query + maxResults + region
- **Storage**: In-memory cache (single instance)

### Configuration

Set environment variables to customize security settings:

```bash
# Web Search Provider (required for claim verification)
TAVILY_API_KEY=your_key_here     # Recommended
# OR
BING_SEARCH_KEY=your_key_here
# OR
SERP_API_KEY=your_key_here

# Optional: Adjust fetch limits
FETCH_MAX_BYTES=10485760         # 10MB default
FETCH_TIMEOUT_MS=10000            # 10s default
FETCH_CONNECT_TIMEOUT_MS=5000     # 5s default
```

### Threat Coverage

| Attack Vector | Mitigation |
|--------------|------------|
| DNS Rebinding | ✅ IP pinning with undici custom Agent |
| IPv6-mapped IPv4 | ✅ Normalization before validation |
| Private IP access | ✅ Comprehensive blocklist |
| Port scanning | ✅ Port allowlist (443 only) |
| SSRF via redirects | ✅ Per-hop validation with re-pinning |
| Protocol downgrade | ✅ HTTPS-only enforcement |
| Resource exhaustion | ✅ Size limits + timeouts + rate limiting |
| XXE attacks | ✅ No XML in default Content-Type allowlist |

### Known Limitations

1. **Failover**: IP failover relies on undici re-invoking the custom lookup on connection failure. Best-effort only.
2. **Post-connection verification**: No explicit remoteAddress verification (defense-in-depth, IP pinning already prevents TOCTOU).
3. **Cache/rate limit scaling**: In-memory storage doesn't scale horizontally (acceptable for MVP).

### Security Audit

Last reviewed: September 30, 2025

**Findings**:
- DNS rebinding TOCTOU vulnerability eliminated via IP pinning
- All major private IP ranges blocked
- Production-ready for agentic RAG with claim verification

**Architect Verdict**: Pass - SSRF protections strong and production-ready

### Reporting Security Issues

If you discover a security vulnerability, please report it to the development team. Do not create public GitHub issues for security vulnerabilities.

## Dependencies

### Third-Party Services

All API keys should be treated as secrets and never committed to version control:

- **OpenAI**: GPT models for embeddings and text generation
- **Pinecone**: Vector database for document embeddings
- **Cohere**: Semantic reranking
- **Tavily/Bing/SerpAPI**: Web search for claim verification (choose one)

### npm Packages

Critical security dependencies:
- `undici` - HTTP client with custom Agent support for IP pinning
- `express-session` - Session management with PostgreSQL store
- `openid-client` - Replit Auth (OpenID Connect)

Run `npm audit` regularly to check for known vulnerabilities.

## Best Practices

1. **Never commit secrets** - Use environment variables for all API keys
2. **Rotate keys regularly** - Especially after team member departures
3. **Monitor logs** - Watch for unusual web fetch patterns or rate limit hits
4. **Review integrations** - Audit third-party API usage quarterly
5. **Test SSRF defenses** - Include SSRF test cases in security testing

## Compliance

- **GDPR**: User data can be deleted via account deletion (soft deletes)
- **Data Retention**: Session data expires after 7 days
- **Privacy**: No PII sent to external APIs except OpenAI (encrypted in transit)

---

*This security policy is maintained alongside the codebase and updated with significant architectural changes.*
