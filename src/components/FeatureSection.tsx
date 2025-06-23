import { motion } from "framer-motion";
import { Shield, Lock, CheckCircle, Fingerprint, Database, BarChart } from "lucide-react";
import { Card, CardContent } from "./ui/card";

const features = [
  {
    icon: Shield,
    title: "Secure Voting",
    description: "Encryption ensures your vote remains confidential"
  },
  {
    icon: Lock,
    title: "MetaMask Authentication",
    description: "Secure login using your MetaMask wallet"
  },
  {
    icon: CheckCircle,
    title: "Vote Verification",
    description: "Verify your vote using Merkle tree proofs"
  },
  {
    icon: Database,
    title: "Database Storage",
    description: "Votes stored securely in Supabase database"
  },
  {
    icon: BarChart,
    title: "Live Analytics",
    description: "Real-time voting statistics and turnout tracking"
  }
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function FeatureSection() {
  return (
    <section className="py-8 bg-muted/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <h2 className="text-3xl font-bold mb-4">Why Choose E-Matdaan?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our platform combines secure database storage with user-friendly design
            to deliver a reliable and verifiable voting experience.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={item}>
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="mb-4 inline-block"
                  >
                    <feature.icon className="h-8 w-8 text-[#6B21E8]" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
} 