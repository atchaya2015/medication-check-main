import { useState, useEffect } from "react";
import Onboarding from "@/components/Onboarding"; 
import PatientDashboard from "@/components/PatientDashboard"; 
import CaretakerDashboard from "@/components/CaretakerDashboard"; 
import { Button } from "@/components/ui/button";
import { Users, User, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthForms from "../components/AuthForms"; 

type UserType = "patient" | "caretaker" | null;

const Index = () => {
  
  const { session, user, isLoading: isLoadingAuth, signOut } = useAuth();
  const [userType, setUserType] = useState<UserType>(null);
 
  const [isOnboarded, setIsOnboarded] = useState(false);

  
  useEffect(() => {
    if (session?.user) {
      
      if (!userType) { 
        setUserType("patient"); 
      }
      setIsOnboarded(true); 
    } else {
      
      setUserType(null);
      setIsOnboarded(false);
    }
  }, [session?.user]);
  const handleOnboardingComplete = (type: UserType) => {
    setUserType(type);
    setIsOnboarded(true);

  };


  const switchUserType = () => {
    const newType = userType === "patient" ? "caretaker" : "patient";
    setUserType(newType);
    
  };

  
  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen text-lg text-gray-700">
        Loading application and checking authentication...
      </div>
    );
  }

  
  if (!session) {
    return <AuthForms />; 
  }

 
  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MediCare Companion</h1>
              <p className="text-sm text-muted-foreground">
                {userType === "patient" ? "Patient View" : "Caretaker View"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
          
            <Button
              variant="outline"
              onClick={switchUserType}
              className="flex items-center gap-2 hover:bg-accent transition-colors"
              disabled={isLoadingAuth} 
            >
              {userType === "patient" ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
              Switch to {userType === "patient" ? "Caretaker" : "Patient"}
            </Button>
            
            <Button
              variant="ghost"
              onClick={signOut}
              className="flex items-center gap-2 text-red-500 hover:text-red-600"
              disabled={isLoadingAuth} 
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        
        {userType === "patient" ? <PatientDashboard userId={user?.id} /> : <CaretakerDashboard />}
      </main>
    </div>
  );
};

export default Index;