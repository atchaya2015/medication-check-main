import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from "@/components/ui/input"; // shadcn/ui input
import { Button } from "@/components/ui/button"; // shadcn/ui button
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // shadcn/ui card

const AuthForms: React.FC = () => {
  const { signIn, signUp, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await signUp(email, password);
    } else {
      await signIn(email); // Magic Link sign-in
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle className="text-center">{isSignUp ? 'Sign Up' : 'Sign In'}</CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? 'Create your account to get started.' : 'Enter your email for a magic link.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            {isSignUp && (
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>
            <p className="text-center text-sm mt-4">
              <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </span>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForms;