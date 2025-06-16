
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface PasswordSignInFormProps {
  onGoToSignUp: () => void;
  onGoToMagicLink: () => void;
}

const PasswordSignInForm: React.FC<PasswordSignInFormProps> = ({ onGoToSignUp, onGoToMagicLink }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInWithPassword, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      await signInWithPassword(email, password);
      
      setEmail('');
      setPassword('');
    } catch (error) {
      
      console.error('Password sign-in error:', error);
    }
  };

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="signin-email">Email</Label>
            <Input
              id="signin-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="signin-password">Password</Label>
            <Input
              id="signin-password"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
        <div className="flex flex-col gap-2 mt-4">
          <Button variant="link" onClick={onGoToSignUp} disabled={isLoading}>
            Don't have an account? Sign Up
          </Button>
          <Button variant="link" onClick={onGoToMagicLink} disabled={isLoading}>
            Or Sign In with Magic Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordSignInForm;