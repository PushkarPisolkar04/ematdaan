import { User, Mail, Shield, FileText, Eye, CheckCircle, Building, Key, Users2, Vote, Lock, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Building className="h-8 w-8" />,
      title: "Organization Setup",
      description: "Create your organization or join an existing one with an invitation token.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <User className="h-8 w-8" />,
      title: "Account Creation",
      description: "Set up your account with email and password authentication.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: <Vote className="h-8 w-8" />,
      title: "Cast Your Vote",
      description: "Participate in active elections with secure, encrypted voting.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },


    {
      icon: <CheckCircle className="h-8 w-8" />,
      title: "View Results",
      description: "See real-time election results and detailed analytics.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    }
  ];

  return (
    <section className="py-16 bg-muted/20">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A simple and secure voting process designed for organizational elections and decision-making
          </p>
        </div>

        {/* Quick Start Guide */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Target className="h-8 w-8 text-blue-600" />
                Quick Start Guide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-blue-800">For Voters:</h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                      <span>Get invitation token from your organization admin</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                      <span>Join organization and create your account</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                      <span>Cast your vote in active elections</span>
                    </li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-purple-800">For Organization Admins:</h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                      <span>Create your organization</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                      <span>Invite members via email or CSV upload</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                      <span>Create and manage elections</span>
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {steps.map((step, index) => (
            <Card key={index} className="relative hover:shadow-lg transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-6 text-center">
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                  <div className={`${step.bgColor} p-3 rounded-full border-4 border-white shadow-xl`}>
                    <div className={step.color}>{step.icon}</div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="bg-[#6B21E8] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Organization Management */}
        <div className="max-w-4xl mx-auto mb-16">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Users2 className="h-8 w-8 text-green-600" />
                Organization Management
              </CardTitle>
              <CardDescription>
                Understanding access codes and roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Voter</Badge>
                  <div>
                    <p className="font-medium text-sm">For regular voters</p>
                    <p className="text-gray-600 text-xs">Can vote in elections</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Admin</Badge>
                  <div>
                    <p className="font-medium text-sm">For organization admins</p>
                    <p className="text-gray-600 text-xs">Create elections, manage members</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Owner</Badge>
                  <div>
                    <p className="font-medium text-sm">For organization owners</p>
                    <p className="text-gray-600 text-xs">Full control over organization</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Features */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Shield className="h-8 w-8 text-purple-600" />
                Security & Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="font-semibold mb-2">AES-256 Encryption</h4>
                <p className="text-sm text-gray-600">Bank-level encryption protects your vote</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
