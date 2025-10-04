import { useState } from 'react';
import TutorLauncherModal from '@/components/tutor/tutor-launcher-modal';
import ChatInterface from '@/components/tutor/chat-interface';
import LessonPlanPanel from '@/components/tutor/lesson-plan-panel';
import { Button } from '@/components/ui/button';

export default function TutorPage() {
  const [showLauncher, setShowLauncher] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<any>(null);

  const handleStartSession = (config: any, chatId: string) => {
    setSessionConfig(config);
    setActiveChatId(chatId);
    setShowLauncher(false);
  };

  const handleNewSession = () => {
    setActiveChatId(null);
    setSessionConfig(null);
    setShowLauncher(true);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {activeChatId && sessionConfig ? (
        <>
          {/* Left: Lesson Plan */}
          <LessonPlanPanel config={sessionConfig} />
          
          {/* Center: Chat Interface */}
          <ChatInterface 
            chatId={activeChatId} 
            config={sessionConfig}
            onNewSession={handleNewSession}
          />
        </>
      ) : (
        /* Welcome State */
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center max-w-lg px-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-robot text-3xl text-primary"></i>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Welcome to VaktaAI Tutor
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Get personalized tutoring with AI that adapts to your learning style and pace. 
              Start a session to begin learning with interactive explanations and practice.
            </p>
            <Button 
              onClick={() => setShowLauncher(true)}
              className="px-8 py-3 text-lg"
            >
              <i className="fas fa-play mr-3"></i>
              Start Learning Session
            </Button>
          </div>
        </div>
      )}

      {/* Tutor Launcher Modal */}
      {showLauncher && (
        <TutorLauncherModal
          onClose={() => setShowLauncher(false)}
          onStart={handleStartSession}
        />
      )}
    </div>
  );
}
