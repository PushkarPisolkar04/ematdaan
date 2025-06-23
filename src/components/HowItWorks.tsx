import { Wallet, User, Mail, Shield, FileText, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const HowItWorks = () => {
  const steps = [
    {
      icon: <Wallet className="h-12 w-12" />,
      title: "Connect Wallet",
      description: "Connect your MetaMask wallet for authentication.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <User className="h-12 w-12" />,
      title: "Register",
      description: "Complete your registration with valid identity verification.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: <Mail className="h-12 w-12" />,
      title: "Email OTP Auth",
      description: "Verify your identity through email OTP.",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: <Shield className="h-12 w-12" />,
      title: "Cast Vote",
      description: "Cast your vote securely with encryption.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: <FileText className="h-12 w-12" />,
      title: "Get Receipt",
      description: "Receive a Merkle tree proof as your vote receipt.",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: <Eye className="h-12 w-12" />,
      title: "Verify Vote",
      description: "Verify your vote using the Merkle tree proof.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <section className="py-8 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How This Works?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A simple and secure voting process with built-in verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="relative hover:shadow-lg transition-all duration-300 hover:-translate-y-2">
              <CardContent className="p-8 text-center">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <div className={`${step.bgColor} p-4 rounded-full border-4 border-background`}>
                    <div className={step.color}>{step.icon}</div>
                  </div>
                </div>
                
                <div className="mt-8">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="bg-[#6B21E8] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Card className="max-w-3xl mx-auto bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-4">Why Choose E-Matdaan?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="font-semibold mb-2">Secure</h4>
                  <p className="text-muted-foreground">Database security prevents unauthorized access</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Verifiable</h4>
                  <p className="text-muted-foreground">Merkle tree proofs ensure vote integrity</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">⚡ Efficient</h4>
                  <p className="text-muted-foreground">Quick and reliable vote counting</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
