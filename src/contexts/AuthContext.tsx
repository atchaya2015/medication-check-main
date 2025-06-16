
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppError, handleSupabaseError } from '../utils/errorHandler';
import { useToast } from "@/components/ui/use-toast";

interface AuthContextProps {
  session: Session | null;
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);
      setIsLoadingAuth(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoadingAuth(false);
      queryClient.invalidateQueries();
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

 
  const signInPasswordMutation = useMutation<void, AppError, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw handleSupabaseError(error, 'Failed to sign in. Please check your credentials.');
    },
    onSuccess: () => {
      toast({
        title: "Signed In!",
        description: "You have been successfully signed in.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

 
  const signInMagicLinkMutation = useMutation<void, AppError, string>({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw handleSupabaseError(error, 'Failed to send magic link. Please try again.');
    },
    onSuccess: () => {
      toast({
        title: "Magic Link Sent!",
        description: "Check your email for the sign-in link. Click the link to sign in.",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Magic Link Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });


  const signUpMutation = useMutation<void, AppError, { email: string; password: string }>({
    mutationFn: async ({ email, password }) => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw handleSupabaseError(error, 'Failed to sign up. Please try again.');
    },
    onSuccess: () => {
      toast({
        title: "Sign Up Successful!",
        description: "Please check your email to verify your account (if email confirmation is enabled).",
        duration: 5000,
      });
    },
    onError: (error) => {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

 
  const signOutMutation = useMutation<void, AppError>({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw handleSupabaseError(error, 'Failed to sign out. Please try again.');
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
        duration: 3000,
      });
    },
    onError: (error) => {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const value: AuthContextProps = {
    session,
    user,
    
    signInWithPassword: async (email, password) => {
      await signInPasswordMutation.mutateAsync({ email, password });
    },
    
    signInWithMagicLink: signInMagicLinkMutation.mutateAsync,
    
    signUp: async (email, password) => {
      await signUpMutation.mutateAsync({ email, password });
    },
    signOut: signOutMutation.mutateAsync,
    isLoading: isLoadingAuth || signInPasswordMutation.isPending || signInMagicLinkMutation.isPending || signUpMutation.isPending || signOutMutation.isPending,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};