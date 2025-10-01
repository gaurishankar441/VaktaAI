import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  Download, 
  Trash2, 
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Bot,
  Shield,
  Database
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UserSettings {
  model: string;
  temperature: number;
  theme: string;
  privacyDeleteOnSession: boolean;
  analyticsEnabled: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<UserSettings>({
    model: 'gpt-5',
    temperature: 0.7,
    theme: 'light',
    privacyDeleteOnSession: false,
    analyticsEnabled: true,
  });
  const { toast } = useToast();

  // Fetch user settings
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings'],
  });

  useEffect(() => {
    if (userSettings) {
      setSettings({
        model: userSettings.model || 'gpt-5',
        temperature: parseFloat(userSettings.temperature?.toString() || '0.7'),
        theme: userSettings.theme || 'light',
        privacyDeleteOnSession: userSettings.privacyDeleteOnSession || false,
        analyticsEnabled: userSettings.analyticsEnabled !== false,
      });
    }
  }, [userSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: Partial<UserSettings>) => {
      const response = await apiRequest('POST', '/api/settings', settingsData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Settings Saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/export', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vaktaai-export.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Export Started",
        description: "Your data export has been downloaded.",
      });
    },
    onError: () => {
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', '/api/account');
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      // Logout and redirect
      setTimeout(async () => {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include',
          });
        } catch (error) {
          console.error('Logout failed:', error);
        }
        window.location.href = '/login';
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Deletion Failed",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
        deleteAccountMutation.mutate();
      }
    }
  };

  const handleResetToDefaults = () => {
    setSettings({
      model: 'gpt-5',
      temperature: 0.7,
      theme: 'light',
      privacyDeleteOnSession: false,
      analyticsEnabled: true,
    });
  };

  return (
    <MainLayout>
      <div className="flex-1 p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your preferences and privacy
            </p>
          </div>

          {/* AI Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                AI Model Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="model">Preferred Model</Label>
                <Select 
                  value={settings.model} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, model: value }))}
                >
                  <SelectTrigger className="w-full max-w-xs" data-testid="select-model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5">GPT-5</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred AI model for responses
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">
                    Temperature: <Badge variant="outline">{settings.temperature}</Badge>
                  </Label>
                </div>
                <Slider
                  value={[settings.temperature]}
                  onValueChange={(value) => setSettings(prev => ({ ...prev, temperature: value[0] }))}
                  max={1}
                  min={0}
                  step={0.1}
                  className="max-w-xs"
                  data-testid="slider-temperature"
                />
                <p className="text-sm text-muted-foreground">
                  Higher values make responses more creative, lower values more focused
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Theme</Label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, theme: 'light' }))}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      settings.theme === 'light' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-accent'
                    }`}
                    data-testid="theme-light"
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, theme: 'dark' }))}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      settings.theme === 'dark' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-accent'
                    }`}
                    data-testid="theme-dark"
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, theme: 'system' }))}
                    className={`flex items-center gap-2 p-3 border rounded-lg transition-colors ${
                      settings.theme === 'system' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-accent'
                    }`}
                    data-testid="theme-system"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Delete data on session end</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically delete chat history and uploads when you sign out
                  </p>
                </div>
                <Switch
                  checked={settings.privacyDeleteOnSession}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, privacyDeleteOnSession: checked }))
                  }
                  data-testid="switch-delete-on-session"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Analytics & Usage Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve VaktaAI by sharing anonymous usage data
                  </p>
                </div>
                <Switch
                  checked={settings.analyticsEnabled}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, analyticsEnabled: checked }))
                  }
                  data-testid="switch-analytics"
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Data Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download all your data including notes, chat history, quizzes, and flashcards.
                </p>
                <Button 
                  variant="outline"
                  onClick={handleExportData}
                  disabled={exportDataMutation.isPending}
                  data-testid="button-export-data"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportDataMutation.isPending ? "Exporting..." : "Export My Data"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleteAccountMutation.isPending}
                  data-testid="button-delete-account"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteAccountMutation.isPending ? "Deleting..." : "Delete My Account"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button 
              variant="outline"
              onClick={handleResetToDefaults}
              data-testid="button-reset-defaults"
            >
              Reset to Defaults
            </Button>
            <Button 
              onClick={handleSaveSettings}
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
