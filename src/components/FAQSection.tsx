import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FAQSection = () => {
  const faqs = [
    {
      question: "How secure is the voting system?",
      answer: "E-Matdaan uses military-grade AES-256 encryption and digital signatures to protect your vote. Each vote is encrypted before storage and can only be decrypted with proper authorization. Our system ensures vote integrity and prevents tampering."
    },
    {
      question: "How do I create an organization?",
      answer: "Creating an organization is simple! Click 'Create Organization' on the login page, fill in your organization name, your details as admin, and set a secure password. Once created, you can invite members and start creating elections immediately."
    },
    {
      question: "How do I join an existing organization?",
      answer: "You'll need an invitation token from your organization admin. Click 'Join Organization' on the login page, enter the token, your personal details, and create your account. The token ensures only authorized users can join."
    },
    {
      question: "Can I vote multiple times in the same election?",
      answer: "No, the system prevents double voting through sophisticated database checks and unique voter identification. Each user can only vote once per election, and this is enforced at both the application and database levels."
    },

    {
      question: "What if I forget my password?",
      answer: "Please contact your organization administrator to reset your password. They have the ability to help you regain access to your account."
    },
    {
      question: "Is my personal information safe?",
      answer: "Absolutely! We use industry-standard encryption for all personal data. Your vote choices are encrypted and cannot be linked back to you. Only your organization admin can see basic account information, and even they cannot see how you voted."
    },
    {
      question: "What happens if there's a power outage or technical issue?",
      answer: "Our system is built with redundancy and automatic backups. If you experience issues during voting, your partial vote is saved and you can continue where you left off. All data is backed up in real-time to prevent any loss."
    },
    {
      question: "Can I see the election results?",
      answer: "Yes! Once an election ends, results are automatically calculated and displayed. You can view detailed statistics, candidate performance, and participation rates. Results are also available for download as PDF reports."
    },
    {
      question: "How do I invite members to my organization?",
      answer: "As an admin, go to the Admin Dashboard and use the 'Invite Members' feature. You can invite individuals by email or upload a CSV file for bulk invitations. Each invitation includes a secure token for joining."
    },
    {
      question: "What makes E-Matdaan different from other voting systems?",
      answer: "E-Matdaan combines enterprise-grade security with user-friendly design. Unlike complex blockchain systems, we use advanced cryptography that's accessible to everyone. Our system supports multiple organizations, provides detailed analytics, and ensures complete vote privacy while maintaining transparency."
    },
    {
      question: "How do I know the election results are accurate?",
      answer: "Our system uses cryptographic proofs to ensure accuracy. Each vote is digitally signed and verified. The final count is mathematically provable, and all election data is auditable while maintaining voter privacy."
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
