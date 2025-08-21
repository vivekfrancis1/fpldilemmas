import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useFplAuth } from "@/hooks/useFplAuth";

interface FplLoginFormProps {
  onSuccess?: () => void;
}

export function FplLoginForm({ onSuccess }: FplLoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoggingIn, loginError, clearError } = useFplAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!formData.email || !formData.password) {
      return;
    }

    login(formData, {
      onSuccess: () => {
        setFormData({ email: "", password: "" });
        onSuccess?.();
      },
    });
  };

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (loginError) clearError();
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="fpl-login-form">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Connect Your FPL Team</CardTitle>
        <CardDescription>
          Login with your Fantasy Premier League account to view and manage your team
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your FPL email"
              value={formData.email}
              onChange={handleChange("email")}
              disabled={isLoggingIn}
              required
              data-testid="input-email"
              className="h-10"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your FPL password"
                value={formData.password}
                onChange={handleChange("password")}
                disabled={isLoggingIn}
                required
                data-testid="input-password"
                className="h-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoggingIn}
                data-testid="toggle-password-visibility"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>

          {loginError && (
            <Alert variant="destructive" data-testid="login-error">
              <AlertDescription>
                {loginError instanceof Error ? loginError.message : "Login failed. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full h-10"
            disabled={isLoggingIn || !formData.email || !formData.password}
            data-testid="button-login"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting to FPL...
              </>
            ) : (
              "Connect Team"
            )}
          </Button>
        </form>
        
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Secure Connection
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                Your login credentials are securely transmitted to Fantasy Premier League. 
                We never store your password and use the same authentication system as the official FPL website.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}