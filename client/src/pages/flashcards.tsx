import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { Brain, Plus, RotateCcw, Star, StarHalf } from 'lucide-react';

export default function FlashcardsPage() {
  const [mode, setMode] = useState<'browse' | 'review'>('browse');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: allCards = [] } = useQuery({
    queryKey: ['/api/flashcards'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/flashcards?userId=default-user');
      return res.json();
    }
  });

  const { data: dueCards = [] } = useQuery({
    queryKey: ['/api/flashcards', 'due'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/flashcards/due?userId=default-user');
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: { front: string; back: string }) => {
      const res = await apiRequest('POST', '/flashcards', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards', 'due'] });
      setCreateDialogOpen(false);
    }
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, rating }: { id: string; rating: number }) => {
      const res = await apiRequest('PUT', `/flashcards/${id}/review`, { rating });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards', 'due'] });
      if (currentIndex < dueCards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setFlipped(false);
      } else {
        setMode('browse');
        setCurrentIndex(0);
        setFlipped(false);
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      front: formData.get('front') as string,
      back: formData.get('back') as string
    });
  };

  const handleRating = (rating: number) => {
    if (dueCards[currentIndex]) {
      reviewMutation.mutate({ id: dueCards[currentIndex].id, rating });
    }
  };

  const currentCard = mode === 'review' && dueCards[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Flashcards</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {allCards.length} total · {dueCards.length} due for review
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {mode === 'browse' && dueCards.length > 0 && (
              <Button
                onClick={() => setMode('review')}
                className="bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700"
                data-testid="button-start-review"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Study Now ({dueCards.length})
              </Button>
            )}

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-flashcard">
                  <Plus className="w-4 h-4 mr-2" />
                  New Flashcard
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Flashcard</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label htmlFor="front">Front (Question)</Label>
                    <Textarea
                      id="front"
                      name="front"
                      placeholder="What is the derivative of x²?"
                      required
                      data-testid="input-flashcard-front"
                    />
                  </div>
                  <div>
                    <Label htmlFor="back">Back (Answer)</Label>
                    <Textarea
                      id="back"
                      name="back"
                      placeholder="2x"
                      required
                      data-testid="input-flashcard-back"
                    />
                  </div>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-flashcard">
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {mode === 'browse' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allCards.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Brain className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No flashcards yet</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create your first flashcard to start learning!
                  </p>
                </CardContent>
              </Card>
            ) : (
              allCards.map((card: any) => (
                <Card key={card.id} className="hover:shadow-lg transition-shadow" data-testid={`card-flashcard-${card.id}`}>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {card.nextReview ? new Date(card.nextReview).toLocaleDateString() : 'New'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-semibold mb-2" data-testid={`text-front-${card.id}`}>{card.front}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" data-testid={`text-back-${card.id}`}>{card.back}</p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Interval: {card.interval || 1}d</span>
                      <span>·</span>
                      <span>Reviews: {card.lastReviewed ? '✓' : '-'}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Card {currentIndex + 1} of {dueCards.length}
              </p>
            </div>

            <div className="perspective-1000 mb-6">
              <div
                className={`relative w-full h-96 transition-transform duration-500 transform-style-3d cursor-pointer ${
                  flipped ? 'rotate-y-180' : ''
                }`}
                onClick={() => setFlipped(!flipped)}
                data-testid="flashcard-flip-container"
              >
                <Card className={`absolute inset-0 backface-hidden ${!flipped ? 'block' : 'hidden'}`}>
                  <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">QUESTION</p>
                    <p className="text-2xl font-semibold" data-testid="text-current-front">{currentCard?.front}</p>
                    <p className="text-sm text-gray-400 mt-4">Click to reveal answer</p>
                  </CardContent>
                </Card>

                <Card className={`absolute inset-0 backface-hidden ${flipped ? 'block' : 'hidden'}`}>
                  <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">ANSWER</p>
                    <p className="text-2xl font-semibold" data-testid="text-current-back">{currentCard?.back}</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {flipped && (
              <div className="space-y-3">
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                  How well did you remember?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleRating(0)}
                    disabled={reviewMutation.isPending}
                    className="border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    data-testid="button-rating-0"
                  >
                    Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(2)}
                    disabled={reviewMutation.isPending}
                    className="border-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    data-testid="button-rating-2"
                  >
                    Hard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(4)}
                    disabled={reviewMutation.isPending}
                    className="border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                    data-testid="button-rating-4"
                  >
                    Good
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleRating(5)}
                    disabled={reviewMutation.isPending}
                    className="col-span-3 border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    data-testid="button-rating-5"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Perfect
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
