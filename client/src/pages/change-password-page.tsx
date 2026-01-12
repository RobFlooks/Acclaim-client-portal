import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, KeyRound } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import acclaimLogo from "@assets/Acclaim rose.Cur_1752271300769.png";

export default function ChangePasswordPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    setTimeout(() => navigate("/auth"), 0);
    return null;
  }

  if (!user.mustChangePassword) {
    setTimeout(() => navigate("/"), 0);
    return null;
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter");
      setIsLoading(false);
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter");
      setIsLoading(false);
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number");
      setIsLoading(false);
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError("Password must contain at least one special character");
      setIsLoading(false);
      return;
    }

    try {
      await apiRequest("POST", "/api/user/set-password", {
        newPassword,
        confirmPassword,
      });

      toast({
        title: "Password set successfully",
        description: "You can now access the system with your new password.",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Failed to set password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img
              src={acclaimLogo}
              alt="Acclaim Credit Management"
              className="h-16 w-16 mr-3"
            />
            <div className="text-left">
              <h1 className="text-2xl font-bold text-acclaim-navy">Acclaim</h1>
              <p className="text-sm text-muted-foreground">
                Credit Management &amp; Recovery
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-3">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>
            <div className="text-left">
              <h2 className="text-xl font-semibold text-gray-900">
                Set Your Password
              </h2>
              <p className="text-sm text-muted-foreground">
                Create a secure password for your account
              </p>
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Create New Password</CardTitle>
            <CardDescription>
              Choose a secure password for your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="h-11 pr-10"
                    required
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword((v) => !v)}
                    data-testid="button-toggle-new-password"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    className="h-11 pr-10"
                    required
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription data-testid="text-error">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-acclaim-teal hover:bg-acclaim-teal/90 font-medium"
                disabled={isLoading}
                data-testid="button-set-password"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting Password...
                  </>
                ) : (
                  "Set Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
