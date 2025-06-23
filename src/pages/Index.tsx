import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Vote, Shield, Users, Clock, CheckCircle, FileText, Eye, Wallet, Mail, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import CountdownTimer from "@/components/CountdownTimer";
import LiveStats from "@/components/LiveStats";
import HowItWorks from "@/components/HowItWorks";
import FAQSection from "@/components/FAQSection";
import { getElectionStatus, getElectionStats } from "@/lib/api/election";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { electionApi } from "@/lib/supabase";
import FeatureSection from "@/components/FeatureSection";
import StatsSection from "@/components/StatsSection";

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
  }>;
}

const Index = () => {
  const navigate = useNavigate();
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const elections = await electionApi.getActiveElections();
        setActiveElections(elections);
        if (elections.length > 0) {
          setSelectedElection(elections[0]);
        }
      } catch (error) {
        console.error('Failed to fetch elections:', error);
      }
    };

    fetchElections();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-16">
        {/* Hero Section */}
        <section className="section-hero section-spacing">
          <div className="container">
            <div className="text-center max-w-4xl mx-auto">
              <img src="/logo.png" alt="E-Matdaan Logo" className="h-20 w-auto mx-auto mb-6" />
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary-color">
                Welcome to eMatdaan
              </h1>

              <p className="text-xl text-[#6B21E8] mb-4">
                A Secure Digital Voting System
              </p>
              
              <p className="text-lg text-foreground/70 mb-8">
                E-Matdaan combines database security with user-friendly design to deliver 
                a voting platform that's secure and accessible. With encryption, 
                MetaMask authentication, and vote verification through Merkle trees, 
                we ensure your vote is counted correctly.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-12">
                <Button 
                  onClick={() => navigate('/login')} 
                  className="bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
                >
                  Start Voting
                </Button>

                <Button 
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                  className="border-[#6B21E8] hover:bg-[#6B21E8]/5"
                >
                  Learn More
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-feature p-6 text-center">
                  <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Secure</h3>
                  <p className="text-sm text-foreground/70">MetaMask authentication</p>
                </div>
                
                <div className="card-feature p-6 text-center">
                  <Eye className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Verifiable</h3>
                  <p className="text-sm text-foreground/70">Merkle tree verification</p>
                </div>
                
                <div className="card-feature p-6 text-center">
                  <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold mb-2">Reliable</h3>
                  <p className="text-sm text-foreground/70">Database-backed storage</p>
                </div>
              </div>
            </div>
          </div>
        </section>

          {/* Active Elections Section */}
        <section className="section-elections section-spacing">
          <div className="container">
            <h2 className="text-3xl font-bold mb-8 text-center text-[#6B21E8]">
              Active Elections
            </h2>

            {activeElections.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <Clock className="h-12 w-12 text-[#6B21E8]/60 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Active Elections</h3>
                <p className="text-muted-foreground mb-6">
                      There are currently no active elections. Please check back later.
                    </p>
                <Button 
                  onClick={() => navigate('/results')} 
                  variant="outline"
                  className="border-[#6B21E8] hover:bg-[#6B21E8]/5 mr-4"
                >
                        View Past Results
                      </Button>
                <Button 
                  onClick={() => navigate('/login')} 
                  className="bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
                >
                        Login to Dashboard
                      </Button>
                    </div>
            ) : (
              <div className="space-y-6">
                  <Tabs
                    defaultValue={activeElections[0]?.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                  >
                  <TabsList className="w-full border-b bg-slate-50 p-0">
                      {activeElections.map((election) => (
                        <TabsTrigger 
                          key={election.id} 
                          value={election.id}
                        className="flex-1 px-6 py-3 data-[state=active]:bg-[#6B21E8] data-[state=active]:text-white"
                        >
                          {election.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                  {activeElections.map((election) => {
                    const now = new Date();
                    const startTime = new Date(election.start_time);
                    const endTime = new Date(election.end_time);
                    const isStarted = now >= startTime;
                    const isEnded = now >= endTime;
                    const isLive = isStarted && !isEnded;

                    return (
                      <TabsContent key={election.id} value={election.id} className="p-6">
                        <div className="text-center mb-8">
                          <CountdownTimer 
                            startTime={startTime}
                            endTime={endTime}
                          />

                          <Button 
                            onClick={() => navigate(`/vote/${election.id}`)}
                            className={`w-full mt-4 ${
                              isLive 
                                ? "bg-[#6B21E8] hover:bg-[#6B21E8]/90 text-white"
                                : "bg-slate-200 text-slate-600 cursor-not-allowed"
                            }`}
                            disabled={!isLive}
                          >
                            {isLive ? "Cast your vote now" : isEnded ? "Voting has ended" : "Voting not started yet"}
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-medium mb-2">Live Statistics</h4>
                            {isStarted ? (
                              <LiveStats electionId={election.id} />
                            ) : (
                              <div className="bg-slate-50 rounded-lg p-4 text-center text-slate-600">
                                Statistics will be available once voting begins
                              </div>
                            )}
                          </div>

                          <div>
                            <h4 className="font-medium mb-2">Candidates</h4>
                            <div className="space-y-2">
                              {election.candidates.map((candidate) => (
                                <div key={candidate.id} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#6B21E8]/10 flex items-center justify-center">
                                      <div className="bg-white rounded-full p-2 shadow-sm">
                                        {candidate.symbol}
                                      </div>
                                    </div>
                                <div>
                                  <div className="font-medium">{candidate.name}</div>
                                  <div className="text-sm text-muted-foreground">{candidate.party}</div>
                                    </div>
                                </div>
                              </div>
                            ))}
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
                    </div>
            )}
          </div>
        </section>

          {/* Features Section */}
        <section className="section-features section-spacing">
          <div className="container">
          <FeatureSection />
          </div>
        </section>

          {/* How It Works Section */}
        <section className="section-how-it-works section-spacing">
          <div className="container">
          <HowItWorks />
          </div>
        </section>

          {/* Stats Section */}
        <section className="section-stats section-spacing">
          <div className="container">
          <StatsSection />
          </div>
        </section>

          {/* FAQ Section */}
        <section className="section-faq section-spacing">
          <div className="container">
          <FAQSection />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
