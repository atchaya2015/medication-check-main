
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface MagicLinkSignInFormProps {
  onGoToPasswordSignIn: () => void;
  onGoToSignUp: () => void;
}

const MagicLinkSignInForm: React.FC<MagicLinkSignInFormProps> = ({ onGoToPasswordSignIn, onGoToSignUp }) => {
  const [email, setEmail] = useState('');
  const { signInWithMagicLink, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await signInWithMagicLink(email);
     
      setEmail('');
    } catch (error) {
      
      console.error("Magic link sign-in error:", error);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Magic Link Sign In</CardTitle>
        <CardDescription>
          Enter your email to receive a unique sign-in link.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="magiclink-email">Email</Label>
            <Input
              id="magiclink-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending Link..." : "Send Magic Link"}
          </Button>
        </form>
        <div className="flex flex-col gap-2 mt-4">
            <Button variant="link" onClick={onGoToPasswordSignIn} disabled={isLoading}>
                Or Sign In with Password
            </Button>
            <Button variant="link" onClick={onGoToSignUp} disabled={isLoading}>
                Don't have an account? Sign Up
            </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MagicLinkSignInForm;