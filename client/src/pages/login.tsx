import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Shield } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const { toast } = useToast();

  const sendOTPMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send OTP");
      }
      return response.json();
    },
    onSuccess: () => {
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: "Check your email for the verification code",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ email, otp }: { email: string; otp: string }) => {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to verify OTP");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome to FPL Dilemmas!",
      });
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    sendOTPMutation.mutate(email);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyOTPMutation.mutate({ email, otp });
  };

  const handleResendOTP = () => {
    sendOTPMutation.mutate(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-fpl-purple">
            FPL Dilemmas
          </CardTitle>
          <CardDescription>
            {step === "email" 
              ? "Enter your email to receive a verification code"
              : "Enter the 6-digit code sent to your email"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-email"
                    required
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-fpl-purple hover:bg-fpl-purple/90"
                disabled={sendOTPMutation.isPending}
                data-testid="button-send-otp"
              >
                {sendOTPMutation.isPending ? "Sending..." : "Send Verification Code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-10 text-center text-lg tracking-widest"
                    data-testid="input-otp"
                    maxLength={6}
                    required
                  />
                </div>
                <p className="text-sm text-gray-600">
                  Code sent to {email}
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-fpl-purple hover:bg-fpl-purple/90"
                disabled={verifyOTPMutation.isPending}
                data-testid="button-verify-otp"
              >
                {verifyOTPMutation.isPending ? "Verifying..." : "Verify & Login"}
              </Button>
              <div className="flex justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep("email")}
                  data-testid="button-change-email"
                >
                  Change Email
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOTP}
                  disabled={sendOTPMutation.isPending}
                  data-testid="button-resend-otp"
                >
                  Resend Code
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}