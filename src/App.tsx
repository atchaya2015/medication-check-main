
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PasswordSignInForm from './components/PasswordSignInForm'; // Import for password login
import MagicLinkSignInForm from './components/MagicLinkSignInForm'; // Import for magic link login
import SignUpForm from './components/SignUpForm'; // Import for password signup

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


function AuthFlowOrApp() {
  const { user, isLoading } = useAuth();
 
  const [authMethod, setAuthMethod] = useState<'passwordSignIn' | 'magicLinkSignIn' | 'signUp'>('passwordSignIn');

  if (isLoading) {
    return <div className="text-center p-8 text-xl">Loading application...</div>;
  }

  if (user) {
    
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {authMethod === 'passwordSignIn' && (
        <PasswordSignInForm
          onGoToSignUp={() => setAuthMethod('signUp')}
          onGoToMagicLink={() => setAuthMethod('magicLinkSignIn')}
        />
      )}
      {authMethod === 'magicLinkSignIn' && (
        <MagicLinkSignInForm
          onGoToPasswordSignIn={() => setAuthMethod('passwordSignIn')}
          onGoToSignUp={() => setAuthMethod('signUp')}
        />
      )}
      {authMethod === 'signUp' && (
        <SignUpForm
          onGoToSignIn={() => setAuthMethod('passwordSignIn')} 
        />
      )}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider> 
          <AuthFlowOrApp /> 
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;