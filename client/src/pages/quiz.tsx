import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QuizPlayer from '@/components/quiz/quiz-player';
import QuizResults from '@/components/quiz/quiz-results';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/api';

export default function QuizPage() {
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // Quiz creation form state
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [count, setCount] = useState(5);

  // Fetch user's quizzes
  const { data: quizzes, refetch } = useQuery({
    queryKey: ['/api/quizzes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/quizzes');
      return response.json();
    }
  });

  const handleCreateQuiz = async () => {
    if (!subject || !topic) return;
    
    setIsCreating(true);
    try {
      const response = await apiRequest('POST', '/quizzes', {
        source: 'topic',
        subject,
        topic,
        difficulty,
        count,
        language: 'en',
        exam: 'JEE',
        userId: 'default-user'
      });
      const quiz = await response.json();
      setActiveQuizId(quiz.id);
      refetch();
    } catch (error) {
      console.error('Failed to create quiz:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuizComplete = (quizResults: any) => {
    setResults(quizResults);
    setShowResults(true);
    setActiveQuizId(null);
  };

  const handleRetakeQuiz = () => {
    setShowResults(false);
    setResults(null);
  };

  if (showResults && results) {
    return (
      <QuizResults
        results={results}
        onRetake={handleRetakeQuiz}
        onClose={() => {
          setShowResults(false);
          setResults(null);
        }}
      />
    );
  }

  if (activeQuizId) {
    return (
      <QuizPlayer
        quizId={activeQuizId}
        onComplete={handleQuizComplete}
        onExit={() => setActiveQuizId(null)}
      />
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Quiz Center</h1>
          <p className="text-lg text-muted-foreground">
            Test your knowledge with AI-generated quizzes tailored to your learning level
          </p>
        </div>

        {/* Create New Quiz */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-plus-circle text-primary"></i>
              Create New Quiz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger data-testid="select-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physics">Physics</SelectItem>
                    <SelectItem value="chemistry">Chemistry</SelectItem>
                    <SelectItem value="mathematics">Mathematics</SelectItem>
                    <SelectItem value="biology">Biology</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Topic</label>
              <Input
                type="text"
                placeholder="e.g., Rotational Motion, Organic Chemistry"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                data-testid="input-topic"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Number of Questions
                </label>
                <Select value={count.toString()} onValueChange={(value) => setCount(parseInt(value))}>
                  <SelectTrigger data-testid="select-question-count">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 Questions</SelectItem>
                    <SelectItem value="10">10 Questions</SelectItem>
                    <SelectItem value="15">15 Questions</SelectItem>
                    <SelectItem value="20">20 Questions</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreateQuiz}
              disabled={!subject || !topic || isCreating}
              className="w-full"
              data-testid="button-create-quiz"
            >
              {isCreating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Generating Quiz...
                </>
              ) : (
                <>
                  <i className="fas fa-magic mr-2"></i>
                  Create Quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Quizzes */}
        {quizzes && quizzes.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Recent Quizzes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz: any) => (
                <Card key={quiz.id} className="hover:border-primary cursor-pointer" onClick={() => setActiveQuizId(quiz.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <i className="fas fa-clipboard-question text-primary"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{quiz.topic}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary">{quiz.subject}</Badge>
                          <Badge variant="outline">{quiz.difficulty}</Badge>
                          <Badge variant="outline">{Array.isArray(quiz.questions) ? quiz.questions.length : 0} Qs</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
