import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Chrome, Facebook, Apple } from "lucide-react";

export default function AuthLogin() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-green-50 dark:from-purple-950 dark:to-green-950">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            FPL Dilemmas
          </CardTitle>
          <CardDescription className="text-lg">
            Analytical tools to beat the deadline blues
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            Connect your social account to get started
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full h-12 text-left justify-start gap-3"
            onClick={() => window.location.href = '/auth/google'}
          >
            <Chrome className="h-5 w-5 text-blue-500" />
            Continue with Google
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-12 text-left justify-start gap-3"
            onClick={() => window.location.href = '/auth/facebook'}
          >
            <Facebook className="h-5 w-5 text-blue-600" />
            Continue with Facebook
          </Button>
          
          <Button
            variant="outline"
            className="w-full h-12 text-left justify-start gap-3"
            onClick={() => window.location.href = '/auth/apple'}
          >
            <Apple className="h-5 w-5 text-gray-800 dark:text-gray-200" />
            Continue with Apple
          </Button>
          
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              After connecting, you'll set up your FPL Team ID to sync your team data
            </p>
          </div>
          
          {/* Demo login for testing */}
          <div className="mt-8 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Demo Mode (for testing)
            </p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => window.location.href = '/auth/setup-team?demo=true'}
            >
              Continue as Demo User
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}