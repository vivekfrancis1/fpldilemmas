import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function Login() {
  const handleGoogleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="flex justify-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              FPL Dilemmas
            </CardTitle>
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mt-1">
              FPL made smarter with predictive analytics
            </p>
          </div>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Sign in to access advanced FPL analytics and insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <Button
            onClick={handleGoogleLogin}
            className="w-full h-12 text-base font-medium bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-200"
            data-testid="button-google-login"
          >
            <SiGoogle className="h-5 w-5 mr-3 text-[#4285F4]" />
            Continue with Google
          </Button>
          
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}