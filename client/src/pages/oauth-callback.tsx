import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function OAuthCallback() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    // Extract sessionId from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    
    if (sessionId) {
      // Store session in localStorage
      localStorage.setItem('fpl-session-id', sessionId);
      console.log('🔐 Session stored:', sessionId);
      
      // Redirect to team setup
      navigate('/auth/setup-team');
    } else {
      // No session ID found, redirect to login
      console.error('❌ No session ID in callback');
      navigate('/auth/login');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold">Completing Authentication</h3>
            <p className="text-muted-foreground mt-2">Setting up your account...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}