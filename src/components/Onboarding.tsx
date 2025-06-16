
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Heart } from "lucide-react";

interface OnboardingProps {
  onComplete: (userType: "patient" | "caretaker") => void;
}

const Onboarding = ({ onComplete }: OnboardingProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Welcome to MediCare Companion
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your trusted partner in medication management. Choose your role to get started with personalized features.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-blue-200 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200 transition-colors">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl text-blue-700">I'm a Patient</CardTitle>
              <CardDescription className="text-base">
                Track your medication schedule and maintain your health records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Mark medications as taken
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Upload proof photos (optional)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  View your medication calendar
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  Large, easy-to-use interface
                </li>
              </ul>
              <Button 
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                onClick={() => onComplete("patient")}
              >
                Continue as Patient
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-green-200 cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 transition-colors">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-700">I'm a Caretaker</CardTitle>
              <CardDescription className="text-base">
                Monitor and support your loved one's medication adherence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Monitor medication compliance
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Set up notification preferences
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  View detailed reports
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  Receive email alerts
                </li>
              </ul>
              <Button 
                className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                onClick={() => onComplete("caretaker")}
              >
                Continue as Caretaker
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            You can switch between roles anytime after setup
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
