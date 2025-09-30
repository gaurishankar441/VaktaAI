import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RotateCcw, X, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  clozeText?: string;
  citations?: Array<{
    source: string;
    page?: number;
    time?: number;
  }>;
  intervalDays: number;
  ease: number;
  reviews: number;
  dueAt: string;
}

interface FlashcardReviewerProps {
  deckId?: string;
  onExit?: () => void;
}

export function FlashcardReviewer({ deckId, onExit }: FlashcardReviewerProps) {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch due flashcards
  const { data: dueCards, isLoading, refetch } = useQuery({
    queryKey: ['/api/flashcards/due', deckId ? { deckId } : {}],
    queryFn: async () => {
      const params = deckId ? `?deckId=${deckId}` : '';
      const response = await fetch(`/api/flashcards/due${params}`, {
        credentials: 'include',
      });
      return response.json();
    },
  });

  const reviewCardMutation = useMutation({
    mutationFn: async ({ cardId, rating }: { cardId: string; rating: 'again' | 'hard' | 'good' | 'easy' }) => {
      const response = await apiRequest('POST', `/api/flashcards/${cardId}/review`, { rating });
      return response.json();
    },
    onSuccess: (_, { cardId }) => {
      setReviewedCards(prev => [...prev, cardId]);
      setShowAnswer(false);
      
      // Move to next card or finish
      if (currentCardIndex < (dueCards?.length || 0) - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // All cards reviewed
        toast({
          title: "Review Complete!",
          description: `You've reviewed ${(dueCards?.length || 0)} cards.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/flashcards/due'] });
        queryClient.invalidateQueries({ queryKey: ['/api/flashcards/stats'] });
        onExit?.();
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFlipCard = () => {
    setShowAnswer(!showAnswer);
  };

  const handleRating = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentCard) return;
    reviewCardMutation.mutate({ cardId: currentCard.id, rating });
  };

  const handleReset = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setReviewedCards([]);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  if (!dueCards || dueCards.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
              <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">All Caught Up!</h2>
            <p className="text-muted-foreground mb-4">
              No flashcards are due for review right now.
            </p>
            <Button onClick={onExit}>Back to Flashcards</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentCard = dueCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;
  const remainingCards = dueCards.length - reviewedCards.length;

  const getRatingButtonInfo = (rating: string) => {
    switch (rating) {
      case 'again':
        return { label: 'Again', time: '< 1m', color: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30' };
      case 'hard':
        return { label: 'Hard', time: '5m', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30' };
      case 'good':
        return { label: 'Good', time: '1d', color: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30' };
      case 'easy':
        return { label: 'Easy', time: '3d', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30' };
      default:
        return { label: '', time: '', color: '' };
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Flashcard Review</h1>
            <p className="text-muted-foreground">
              Card {currentCardIndex + 1} of {dueCards.length} • {remainingCards} remaining
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleReset} data-testid="button-reset-review">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onExit} data-testid="button-exit-review">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
      </div>

      {/* Flashcard */}
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          <Card 
            className="min-h-64 cursor-pointer hover:shadow-md transition-shadow"
            onClick={handleFlipCard}
            data-testid="flashcard"
          >
            <CardContent className="p-8 flex flex-col justify-center text-center min-h-64">
              {!showAnswer ? (
                <div>
                  <h3 className="text-xl font-medium mb-4">{currentCard.front}</h3>
                  <p className="text-muted-foreground text-sm">Click to reveal answer</p>
                </div>
              ) : (
                <div>
                  <p className="text-lg mb-4">{currentCard.back}</p>
                  
                  {/* Cloze text if available */}
                  {currentCard.clozeText && (
                    <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                      <p><strong>Complete text:</strong></p>
                      <p>{currentCard.clozeText}</p>
                    </div>
                  )}
                  
                  {/* Citations */}
                  {currentCard.citations && currentCard.citations.length > 0 && (
                    <div className="text-sm text-muted-foreground border-t border-border pt-4 mt-4">
                      <p><strong>Sources:</strong></p>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {currentCard.citations.map((citation, index) => (
                          <Badge key={index} variant="outline">
                            {citation.source}
                            {citation.page && `, page ${citation.page}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Buttons */}
          {showAnswer && (
            <div className="grid grid-cols-4 gap-3 mt-6">
              {(['again', 'hard', 'good', 'easy'] as const).map((rating) => {
                const buttonInfo = getRatingButtonInfo(rating);
                return (
                  <Button
                    key={rating}
                    onClick={() => handleRating(rating)}
                    disabled={reviewCardMutation.isPending}
                    className={`flex flex-col py-6 h-auto ${buttonInfo.color}`}
                    variant="outline"
                    data-testid={`button-rate-${rating}`}
                  >
                    <div className="font-medium">{buttonInfo.label}</div>
                    <div className="text-xs mt-1">{buttonInfo.time}</div>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Card Info */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <div className="flex justify-center gap-4">
              <span>Reviews: {currentCard.reviews}</span>
              <span>Interval: {currentCard.intervalDays} days</span>
              <span>Ease: {parseFloat(currentCard.ease.toString()).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
