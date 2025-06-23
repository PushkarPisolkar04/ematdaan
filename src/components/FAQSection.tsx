import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FAQSection = () => {
  const faqs = [
    {
      question: "How is my vote secured?",
      answer: "Your vote is protected using encryption and stored in a secure database. A Merkle tree system is used to verify votes."
    },
    {
      question: "What is a Verifiable Credential?",
      answer: "A Verifiable Credential is a digital identity document that proves your eligibility to vote. It's linked to your MetaMask wallet address."
    },
    {
      question: "Can I vote again?",
      answer: "No, the system prevents double voting through database checks. Once you cast your vote, it's recorded with your unique digital identity."
    },
    {
      question: "How can I verify my vote?",
      answer: "After voting, you'll receive a receipt with a Merkle proof. You can use this receipt on our verification portal to confirm your vote was recorded correctly."
    },
    {
      question: "What if I lose my MetaMask wallet?",
      answer: "If you lose access to your wallet, you'll need to contact support with proper identification to regain access to your voting account."
    },
    {
      question: "Is my personal information stored securely?",
      answer: "Yes, personal information is stored securely in our database. Only encrypted vote data and verification hashes are stored."
    },
    {
      question: "How do I know the system is secure?",
      answer: "The system uses MetaMask authentication, database security measures, and Merkle tree verification to ensure vote integrity. All actions are logged and monitored."
    },
    {
      question: "What happens if there's a technical issue?",
      answer: "Our technical support team is available during voting periods. The system has database backups and recovery procedures in place."
    },
    {
      question: "Can anyone see how I voted?",
      answer: "No, votes are encrypted before being stored in the database. Only the final tally is visible once the election ends."
    }
  ];

  return (
    <section id="faqs" className="py-8 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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

          <div className="mt-10 text-center">
            <Card className="bg-[#6B21E8]/5 border-[#6B21E8]/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Still have questions?</h3>
                <p className="text-muted-foreground mb-6">
                  Our dedicated support team is here to help you through the voting process.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="text-sm">
                    <strong>Email:</strong> pushkarpisolkar4@gmail.com
                  </div>
                  <div className="text-sm">
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
