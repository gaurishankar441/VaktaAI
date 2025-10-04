import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "./components/layout/app-shell";
import TutorPage from "./pages/tutor";
import DocChatPage from "./pages/docchat";
import QuizPage from "./pages/quiz";
import PlannerPage from "./pages/planner";
import NotesPage from "./pages/notes";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={TutorPage} />
        <Route path="/tutor" component={TutorPage} />
        <Route path="/docchat" component={DocChatPage} />
        <Route path="/quiz" component={QuizPage} />
        <Route path="/planner" component={PlannerPage} />
        <Route path="/notes" component={NotesPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
