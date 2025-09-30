import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { TutorInterface } from "@/components/tutor/TutorInterface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserCheck, Clock, MessageSquare, Plus } from "lucide-react";

interface TutorSession {
  id: string;
  subject: string;
  gradeLevel: string;
  topic: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Tutor() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fetch tutor sessions
  const { data: sessions } = useQuery({
    queryKey: ['/api/tutor/sessions'],
  });

  // If session is selected, show tutor interface
  if (selectedSessionId !== null) {
    return (
      <MainLayout>
        <div className="h-screen flex flex-col">
          <TutorInterface 
            sessionId={selectedSessionId}
            onSessionChange={setSelectedSessionId}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Tutor</h1>
              <p className="text-muted-foreground">
                Get personalized learning assistance
              </p>
            </div>
            <Button 
              onClick={() => setSelectedSessionId('')} // Empty string to trigger new session
              data-testid="button-new-tutor-session"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </div>

          {/* Recent Sessions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Sessions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions && sessions.length > 0 ? (
                sessions.map((session: TutorSession) => (
                  <Card 
                    key={session.id}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => setSelectedSessionId(session.id)}
                    data-testid={`session-${session.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{session.topic}</h3>
                            <Badge variant="outline" className="text-xs mt-1">
                              {session.gradeLevel} • {session.subject}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          <span>Active session</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center">
                    <UserCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No tutor sessions yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Start your first AI tutoring session to get personalized help
                    </p>
                    <Button onClick={() => setSelectedSessionId('')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start First Session
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Subject Areas */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Popular Subject Areas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Mathematics', icon: '📐', description: 'Algebra, Calculus, Geometry' },
                { name: 'Science', icon: '🔬', description: 'Physics, Chemistry, Biology' },
                { name: 'Computer Science', icon: '💻', description: 'Programming, Algorithms' },
                { name: 'History', icon: '📚', description: 'World History, Events' },
                { name: 'Literature', icon: '📖', description: 'Analysis, Writing' },
                { name: 'Languages', icon: '🗣️', description: 'Grammar, Vocabulary' },
                { name: 'Economics', icon: '📊', description: 'Micro, Macro Economics' },
                { name: 'Psychology', icon: '🧠', description: 'Cognitive, Social' },
              ].map((subject) => (
                <Card 
                  key={subject.name}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedSessionId('')}
                  data-testid={`subject-${subject.name.toLowerCase()}`}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">{subject.icon}</div>
                    <h3 className="font-medium text-sm mb-1">{subject.name}</h3>
                    <p className="text-xs text-muted-foreground">{subject.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
