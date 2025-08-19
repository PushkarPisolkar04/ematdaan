import { motion } from "framer-motion";
import { Shield, Eye, Users, Lock, CheckCircle, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Shield,
    title: "Multi-Factor Authentication",
    description: "Secure login with email and OTP verification.",
    color: "from-purple-500 to-purple-600",
    bgColor: "from-purple-50 to-purple-100",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "AES-256 encryption protects every vote from tampering.",
    color: "from-blue-500 to-blue-600",
    bgColor: "from-blue-50 to-blue-100",
  },
  {
    icon: CheckCircle,
    title: "Zero-Knowledge Verification",
    description: "Advanced cryptographic proofs validate votes without revealing choices.",
    color: "from-teal-600 to-cyan-600",
    bgColor: "from-teal-50 to-cyan-50",
  },
  {
    icon: Eye,
    title: "Complete Transparency",
    description: "Public verification without compromising voter privacy.",
    color: "from-orange-500 to-orange-600",
    bgColor: "from-orange-50 to-orange-100",
  },
  {
    icon: Users,
    title: "Multi-Tenant Platform",
    description: "Secure isolated environments for different organizations.",
    color: "from-indigo-500 to-indigo-600",
    bgColor: "from-indigo-50 to-indigo-100",
  },
  {
    icon: Zap,
    title: "Real-Time Results",
    description: "Instant vote counting with live result updates.",
    color: "from-pink-500 to-pink-600",
    bgColor: "from-pink-50 to-pink-100",
  },
];

const FeatureSection = () => {
  return (
    <section id="features" className="py-16 w-full bg-gradient-to-br from-white/50 via-purple-50/30 to-blue-50/50 backdrop-blur-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-left mb-12"
        >
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Why Choose E-Matdaan?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl">
              Built with cutting-edge technology to ensure the highest levels of security, 
              transparency, and accessibility for modern democratic processes.
          </p>
        </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
        <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm group">
                    <CardContent className="p-8 text-left">
                      <div className={`bg-gradient-to-r ${feature.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <div className={`bg-gradient-to-r ${feature.color} p-3 rounded-xl`}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-gray-900">
                        {feature.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                </CardContent>
              </Card>
            </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureSection; 