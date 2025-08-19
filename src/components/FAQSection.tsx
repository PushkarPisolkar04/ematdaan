import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FAQSection = () => {
  const faqs = [
    {
      question: "How is my vote secured?",
      answer: "Your vote is protected using AES-256 encryption, zero-knowledge proofs, and digital signatures. A Merkle tree system is used to verify votes without compromising privacy."
    },
    {
      question: "What authentication methods are supported?",
      answer: "We support traditional email/password authentication with OTP verification. This makes the system accessible to everyone without requiring cryptocurrency wallets."
    },
    {
      question: "Can I vote again?",
      answer: "No, the system prevents double voting through database checks and unique voter identification. Once you cast your vote, it's recorded with your unique digital signature."
    },
    {
      question: "How can I verify my vote?",
      answer: "After voting, you'll receive a receipt with a Merkle proof. You can use this receipt on our verification portal to confirm your vote was recorded correctly and included in the final count."
    },
    {
      question: "What if I forget my password?",
      answer: "You can reset your password using the 'Forgot Password' feature. A reset link will be sent to your registered email address."
    },
    {
      question: "Is my personal information stored securely?",
      answer: "Yes, personal information is stored securely in our database with encryption. Only encrypted vote data and verification hashes are stored, ensuring your privacy is protected."
    },
    {
      question: "How do I know the system is secure?",
      answer: "The system uses multi-factor authentication, AES-256 encryption, zero-knowledge proofs, and blockchain verification to ensure vote integrity. All actions are logged and monitored for security."
    },
    {
      question: "What happens if there's a technical issue?",
      answer: "Our technical support team is available during voting periods. The system has database backups, recovery procedures, and redundant systems in place to ensure reliability."
    },
    {
      question: "Can anyone see how I voted?",
      answer: "No, votes are encrypted before being stored in the database. Only the final tally is visible once the election ends. Individual vote choices remain completely private."
    },
    {
      question: "What makes E-Matdaan different from other voting systems?",
      answer: "E-Matdaan combines enterprise-grade security with user-friendly design. We use zero-knowledge proofs, homomorphic encryption, and blockchain verification while maintaining accessibility for all users."
    }
  ];

  return (
    <section id="faqs" className="py-8 bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about our secure voting system
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Common Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left hover:text-[#6B21E8]">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <Card className="bg-[#6B21E8]/5 border-[#6B21E8]/20">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-3">Still have questions?</h3>
                <p className="text-muted-foreground mb-4">
                  Our dedicated support team is here to help you through the voting process.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm">
                  <div>
                    <strong>Email:</strong> pushkarppisolkar@gmail.com
                  </div>
                  <div>
                    <strong>Hours:</strong> 24/7 during voting
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
