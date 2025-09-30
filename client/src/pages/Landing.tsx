import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  MessageSquare, 
  UserCheck, 
  StickyNote, 
  HelpCircle, 
  Layers, 
  Folder,
  Brain,
  BookOpen,
  Zap,
  Shield,
  Users,
  Star,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function Landing() {
  const features = [
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Document Chat",
      description: "Chat with your PDFs, PowerPoints, and documents using advanced RAG technology",
      color: "text-blue-600"
    },
    {
      icon: <UserCheck className="w-6 h-6" />,
      title: "AI Tutor",
      description: "Get personalized tutoring with pedagogical methods adapted to your learning style",
      color: "text-green-600"
    },
    {
      icon: <StickyNote className="w-6 h-6" />,
      title: "Smart Notes",
      description: "Create structured notes with templates for lectures, research, and study sessions",
      color: "text-purple-600"
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: "Quiz Generator",
      description: "Auto-generate quizzes from your documents with Bloom's taxonomy classification",
      color: "text-orange-600"
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Flashcards",
      description: "Create and review flashcards with spaced repetition for optimal memory retention",
      color: "text-red-600"
    },
    {
      icon: <Folder className="w-6 h-6" />,
      title: "Resource Manager",
      description: "Organize all your learning materials in a clean, searchable interface",
      color: "text-indigo-600"
    }
  ];

  const benefits = [
    "AI-powered learning assistance",
    "Support for multiple file formats",
    "Real-time streaming responses",
    "Citation-based answers",
    "Privacy-focused design",
    "Cross-device synchronization"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-white/80 dark:bg-gray-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">VaktaAI</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-sign-in"
            >
              Sign In
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            <Zap className="w-4 h-4 mr-2" />
            AI-Powered Learning Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            Transform Your
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"> Learning Experience</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Chat with your documents, get AI tutoring, generate quizzes and flashcards, 
            and organize your study materials - all in one intelligent platform.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => window.location.href = '/api/login'}
              data-testid="button-get-started"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              <BookOpen className="w-5 h-5 mr-2" />
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Learn Smarter</h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive tools powered by the latest AI technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-8">
                  <div className={`w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4 ${feature.color}`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Brain className="w-4 h-4 mr-2" />
                Advanced AI Technology
              </Badge>
              
              <h2 className="text-3xl font-bold mb-6">
                Learn More Effectively with AI-Powered Tools
              </h2>
              
              <p className="text-lg text-muted-foreground mb-8">
                VaktaAI combines cutting-edge AI with proven educational methodologies 
                to create a personalized learning experience that adapts to your needs.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">10k+</div>
                <div className="text-sm text-muted-foreground">Documents Processed</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">98%</div>
                <div className="text-sm text-muted-foreground">User Satisfaction</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
                <div className="text-sm text-muted-foreground">Study Templates</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">24/7</div>
                <div className="text-sm text-muted-foreground">AI Availability</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Privacy First</h3>
              <p className="text-muted-foreground">
                Your data is encrypted and secure. We never share your personal information.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <Users className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Trusted by Students</h3>
              <p className="text-muted-foreground">
                Join thousands of learners who trust VaktaAI for their education.
              </p>
            </div>
            
            <div className="flex flex-col items-center">
              <Star className="w-12 h-12 text-yellow-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Proven Results</h3>
              <p className="text-muted-foreground">
                Students report 40% faster learning and better retention rates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join VaktaAI today and experience the future of education.
          </p>
          
          <Button 
            size="lg"
            onClick={() => window.location.href = '/api/login'}
            data-testid="button-cta-start"
          >
            Start Learning Now
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Free to get started
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white/80 dark:bg-gray-900/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">VaktaAI</span>
          </div>
          
          <p className="text-muted-foreground">
            © 2024 VaktaAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
