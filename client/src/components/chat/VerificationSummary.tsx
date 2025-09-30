import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, HelpCircle, ExternalLink, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

interface Claim {
  id: string;
  text: string;
  context?: string;
}

interface Source {
  url: string;
  title: string;
  snippet: string;
  relevance: number;
}

interface VerificationResult {
  claim: Claim;
  status: 'Supported' | 'Contradicted' | 'Uncertain';
  confidence: number;
  sources: Source[];
  reasoning: string;
}

interface VerificationSummaryProps {
  claims: Claim[];
  verifications: VerificationResult[];
  summary: string;
  isLoading?: boolean;
}

export function VerificationSummary({
  claims,
  verifications,
  summary,
  isLoading = false,
}: VerificationSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card className="mt-4 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying claims with web sources...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (claims.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Supported':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'Contradicted':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'Uncertain':
        return <HelpCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'Supported':
        return 'default';
      case 'Contradicted':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Web-Verified Claims
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
            data-testid="button-toggle-verification"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show Details
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1" data-testid="text-verification-summary">
          {summary}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <Accordion type="single" collapsible className="w-full">
            {verifications.map((verification, index) => (
              <AccordionItem key={verification.claim.id} value={`claim-${index}`}>
                <AccordionTrigger className="hover:no-underline" data-testid={`trigger-claim-${index}`}>
                  <div className="flex items-start gap-3 text-left pr-4">
                    {getStatusIcon(verification.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words" data-testid={`text-claim-${index}`}>
                        {verification.claim.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={getStatusBadgeVariant(verification.status)}
                          className="text-xs"
                          data-testid={`badge-status-${index}`}
                        >
                          {verification.status}
                        </Badge>
                        <span className={`text-xs font-medium ${getConfidenceColor(verification.confidence)}`} data-testid={`text-confidence-${index}`}>
                          {Math.round(verification.confidence * 100)}% confident
                        </span>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="pl-7 space-y-3">
                    {/* Reasoning */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1">
                        Reasoning
                      </h4>
                      <p className="text-sm" data-testid={`text-reasoning-${index}`}>
                        {verification.reasoning}
                      </p>
                    </div>

                    {/* Sources */}
                    {verification.sources.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                          Web Sources ({verification.sources.length})
                        </h4>
                        <div className="space-y-2">
                          {verification.sources.map((source, sourceIndex) => (
                            <a
                              key={sourceIndex}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                              data-testid={`link-source-${index}-${sourceIndex}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium line-clamp-1 mb-1" data-testid={`text-source-title-${index}-${sourceIndex}`}>
                                    {source.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2" data-testid={`text-source-snippet-${index}-${sourceIndex}`}>
                                    {source.snippet}
                                  </p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 truncate">
                                    {new URL(source.url).hostname}
                                  </p>
                                </div>
                                <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
}
