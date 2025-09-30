import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { FlashcardReviewer } from "@/components/flashcards/FlashcardReviewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Layers, 
  Eye, 
  Calendar,
  TrendingUp,
  Clock,
  BookOpen
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  totalCards: number;
  createdAt: string;
  updatedAt: string;
}

export default function Flashcards() {
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showReviewer, setShowReviewer] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [deckTitle, setDeckTitle] = useState("");
  const [numberOfCards, setNumberOfCards] = useState(10);
  const [cardType, setCardType] = useState("standard");
  const { toast } = useToast();

  // Fetch flashcard decks
  const { data: decks } = useQuery({
    queryKey: ['/api/flashcards/decks'],
  });

  // Fetch flashcard stats
  const { data: stats } = useQuery({
    queryKey: ['/api/flashcards/stats'],
  });

  // Fetch due flashcards
  const { data: dueCards } = useQuery({
    queryKey: ['/api/flashcards/due'],
  });

  // Fetch documents for flashcard generation
  const { data: documents } = useQuery({
    queryKey: ['/api/documents'],
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/flashcards/generate', {
        documentIds: selectedDocuments,
        numberOfCards,
        cardType,
        title: deckTitle || `Flashcards - ${new Date().toLocaleDateString()}`,
      });
      return response.json();
    },
    onSuccess: () => {
      setShowGenerator(false);
      setSelectedDocuments([]);
      setDeckTitle("");
      setNumberOfCards(10);
      setCardType("standard");
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards/decks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/flashcards/stats'] });
      toast({
        title: "Flashcards Generated",
        description: "Your flashcard deck has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate flashcards. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleGenerateFlashcards = () => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to generate flashcards.",
        variant: "destructive",
      });
      return;
    }
    generateFlashcardsMutation.mutate();
  };

  const getDeckProgress = (deck: FlashcardDeck) => {
    // This would calculate progress based on due cards, mastered cards, etc.
    return Math.floor(Math.random() * 100);
  };

  const getDueCount = (deck: FlashcardDeck) => {
    // This would get the number of due cards for this deck
    return Math.floor(Math.random() * 10);
  };

  const availableDocuments = documents?.filter((doc: any) => doc.status === 'indexed') || [];

  // If reviewing flashcards
  if (showReviewer) {
    return (
      <MainLayout>
        <FlashcardReviewer 
          deckId={selectedDeckId || undefined}
          onExit={() => {
            setShowReviewer(false);
            setSelectedDeckId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/flashcards/stats'] });
            queryClient.invalidateQueries({ queryKey: ['/api/flashcards/due'] });
          }}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
              <p className="text-muted-foreground">
                Review with spaced repetition
              </p>
            </div>
            <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
              <DialogTrigger asChild>
                <Button data-testid="button-generate-flashcards">
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Flashcards
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate New Flashcards</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="deck-title">Deck Title (Optional)</Label>
                    <Input
                      id="deck-title"
                      value={deckTitle}
                      onChange={(e) => setDeckTitle(e.target.value)}
                      placeholder="Enter deck title..."
                      data-testid="input-deck-title"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Number of Cards</Label>
                      <Select value={numberOfCards.toString()} onValueChange={(value) => setNumberOfCards(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 Cards</SelectItem>
                          <SelectItem value="10">10 Cards</SelectItem>
                          <SelectItem value="15">15 Cards</SelectItem>
                          <SelectItem value="20">20 Cards</SelectItem>
                          <SelectItem value="25">25 Cards</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Card Type</Label>
                      <Select value={cardType} onValueChange={setCardType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard (Q&A)</SelectItem>
                          <SelectItem value="cloze">Cloze Deletion</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Documents</Label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {availableDocuments.length > 0 ? (
                        availableDocuments.map((doc: any) => (
                          <div 
                            key={doc.id}
                            className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedDocuments.includes(doc.id) 
                                ? 'bg-primary/10 border-primary' 
                                : 'hover:bg-accent'
                            }`}
                            onClick={() => handleDocumentToggle(doc.id)}
                            data-testid={`document-${doc.id}`}
                          >
                            <div className="w-4 h-4 border-2 rounded flex items-center justify-center">
                              {selectedDocuments.includes(doc.id) && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{doc.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">No processed documents available</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleGenerateFlashcards}
                      disabled={selectedDocuments.length === 0 || generateFlashcardsMutation.isPending}
                      className="flex-1"
                      data-testid="button-confirm-generate"
                    >
                      {generateFlashcardsMutation.isPending ? "Generating..." : "Generate Flashcards"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowGenerator(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Study Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card data-testid="stat-total-cards">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {stats?.total || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Cards</div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-due-cards">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">
                  {stats?.due || 0}
                </div>
                <div className="text-sm text-muted-foreground">Due Today</div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-learning-cards">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {stats?.learning || 0}
                </div>
                <div className="text-sm text-muted-foreground">Learning</div>
              </CardContent>
            </Card>
            
            <Card data-testid="stat-mastered-cards">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {stats?.mastered || 0}
                </div>
                <div className="text-sm text-muted-foreground">Mastered</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Review Section */}
          {dueCards && dueCards.length > 0 && (
            <Card className="mb-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Ready to Review</h3>
                    <p className="text-muted-foreground">
                      You have {dueCards.length} card{dueCards.length > 1 ? 's' : ''} ready for review
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowReviewer(true)}
                    data-testid="button-start-review"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Start Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Flashcard Decks */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {decks && decks.length > 0 ? (
              decks.map((deck: FlashcardDeck) => {
                const progress = getDeckProgress(deck);
                const dueCount = getDueCount(deck);
                
                return (
                  <Card 
                    key={deck.id}
                    className="hover:shadow-md transition-shadow"
                    data-testid={`deck-${deck.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{deck.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {deck.totalCards} cards
                            </p>
                          </div>
                        </div>
                        {dueCount > 0 && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                            {dueCount} due
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progress:</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => {
                            setSelectedDeckId(deck.id);
                            setShowReviewer(true);
                          }}
                          data-testid={`button-review-deck-${deck.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Review Cards
                        </Button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(deck.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <Card className="col-span-full">
                <CardContent className="p-8 text-center">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No flashcard decks yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate your first flashcard deck from your documents
                  </p>
                  <Button onClick={() => setShowGenerator(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Generate First Deck
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
