import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Vote, Shield, Users, Clock, CheckCircle, FileText, Eye, Mail, Key, ArrowRight, Star, Zap, Lock, Building, Info, HelpCircle, Target, Users2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import CountdownTimer from "@/components/CountdownTimer";
import HowItWorks from "@/components/HowItWorks";
import FAQSection from "@/components/FAQSection";
import { getElectionStatus, getElectionStats } from "@/lib/api/election";
import FeatureSection from '@/components/FeatureSection';
import StatsSection from '@/components/StatsSection';
import { fetchTodayStats, fetchPlatformStats, PlatformStats } from "@/lib/api/stats";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { electionApi } from "@/lib/electionApi";
import { supabase, votingApi } from "@/lib/supabase";

interface Election {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  candidates?: Array<{
    id: string;
    name: string;
    party: string;
    symbol: string;
  }>;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, organization, isAuthenticated } = useAuth();
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [todayStats, setTodayStats] = useState({ votesToday: 0, usersToday: 0 });
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [electionsLoading, setElectionsLoading] = useState(false);




  useEffect(() => {
    const scrollTo = searchParams.get('scrollTo');
    if (scrollTo === 'faqs') {
      setTimeout(() => {
        const faqsElement = document.getElementById('faqs');
        if (faqsElement) {
          const navbarHeight = 80;
          const elementPosition = faqsElement.offsetTop - navbarHeight;
          window.scrollTo({
            top: elementPosition,
            behavior: 'smooth'
          });
        }
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      }, 200);
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        setElectionsLoading(true);
        
        if (isAuthenticated && organization?.id) {
          const data = await electionApi.getElections(organization.id);
          
          const now = new Date();
          const activeElectionsData = (data || []).filter(election => {
            const startTime = new Date(election.start_time);
            const endTime = new Date(election.end_time);
            return election.is_active && now >= startTime && now <= endTime;
          });

          setActiveElections(activeElectionsData);
        } else {
          setActiveElections([]);
        }
      } catch (error) {
        console.error('Failed to fetch elections:', error);
        setActiveElections([]);
      } finally {
        setElectionsLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const [todayData, platformData] = await Promise.all([
          fetchTodayStats(),
          fetchPlatformStats()
        ]);
        setTodayStats(todayData);
        setPlatformStats(platformData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchElections();
    fetchStats();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, organization]);



  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="fixed inset-0 bg-gradient-to-br from-purple-100/20 via-blue-50/30 to-indigo-100/20 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM2QjIxRTgiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40 pointer-events-none"></div>
      
      <main className="relative pt-20 w-full">
        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white py-4">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Target className="h-6 w-6 text-yellow-300" />
                  <h3 className="text-lg font-semibold">How to Vote in 3 Simple Steps:</h3>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                    <span>Get Access Code from your organization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                    <span>Sign in with the access code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                    <span>Cast your vote securely</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden py-8 w-full">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-left"
                >
                  <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                    <span className="bg-gradient-to-r from-gray-900 via-purple-800 to-[#6B21E8] bg-clip-text text-transparent">
                      Professional
                    </span>
                    <br />
                    <span className="text-gray-900">Organizational Voting</span>
                  </h1>

                  <p className="text-xl text-gray-700 mb-8 leading-relaxed max-w-2xl">
                    The most advanced digital voting platform designed specifically for organizations. 
                    Perfect for schools, colleges, corporate offices, residential societies, and NGOs. 
                    Secure, transparent, and user-friendly voting for any organizational decision.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Button 
                      onClick={() => navigate('/auth')}
                      className="bg-gradient-to-r from-[#6B21E8] to-purple-600 hover:from-[#6B21E8]/90 hover:to-purple-600/90 text-white px-8 py-4 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      Sign In / Register
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    <Button 
                      onClick={() => navigate('/auth?tab=create')}
                      variant="outline"
                      className="border-2 border-[#6B21E8] text-[#6B21E8] hover:bg-[#6B21E8] hover:text-white px-8 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 bg-white/80 backdrop-blur-sm"
                    >
                      Create Organization
                      <Building className="ml-2 h-5 w-5" />
                    </Button>
                  </div>


                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span>Bank-level Security</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span>Verified Transparent</span>
                    </div>

                  </div>
                </motion.div>

                {/* Right side - Visual */}
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="relative"
                >
                  <div className="relative">
                    <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Live Platform Stats</h3>
                        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          🟢 Live
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-[#6B21E8] rounded-full animate-pulse shadow-lg"></div>
                            <span className="font-medium">Votes Cast Today</span>
                          </div>
                          <span className={`text-2xl font-bold text-[#6B21E8] ${statsLoading ? 'animate-pulse' : ''}`}>
                            {statsLoading ? '...' : todayStats.votesToday.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-200">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-emerald-700 rounded-full animate-pulse shadow-lg border-2 border-white"></div>
                            <span className="font-medium">Total Users</span>
                          </div>
                          <span className={`text-2xl font-bold text-green-600 ${statsLoading ? 'animate-pulse' : ''}`}>
                            {statsLoading ? '...' : (platformStats?.totalUsers || 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl border border-orange-200">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-orange-600 rounded-full animate-pulse shadow-lg"></div>
                            <span className="font-medium">Active Elections</span>
                          </div>
                          <span className={`text-2xl font-bold text-orange-600 ${statsLoading ? 'animate-pulse' : ''}`}>
                            {statsLoading ? '...' : (platformStats?.activeElections || 0)}
                          </span>
                        </div>
                      </div>


                    </div>
                    
                    <div className="absolute -top-4 -right-4 bg-gradient-to-r from-[#6B21E8] to-purple-600 text-white p-3 rounded-xl shadow-lg">
                      <Zap className="h-6 w-6" />
                    </div>
                    
                    <div className="absolute -bottom-4 -left-4 bg-gradient-to-r from-[#6B21E8] to-purple-600 text-white p-3 rounded-xl shadow-lg">
                      <Shield className="h-6 w-6" />
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

          <FeatureSection />

        {isAuthenticated && organization && activeElections.length > 0 && (
          <section className="py-16 w-full bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-indigo-600/10 backdrop-blur-sm">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-left mb-12"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-4xl font-bold mb-2 text-gray-900">Your Active Elections</h2>
                      <p className="text-xl text-gray-600 max-w-3xl">
                        Participate in ongoing elections for {organization.name}. 
                        Each vote is encrypted, verified, and recorded securely for maximum integrity.
                      </p>
                    </div>
                    <Button 
                      onClick={() => navigate('/elections')}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      View All Elections
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>

                {electionsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your elections...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {activeElections.map((election, index) => (
                      <motion.div
                        key={election.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-xl">
                              <div className="bg-gradient-to-r from-[#6B21E8] to-purple-600 p-3 rounded-xl">
                                <Vote className="h-6 w-6 text-white" />
                              </div>
                              {election.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 text-gray-600">
                              <Clock className="h-5 w-5" />
                              <span className="font-medium">
                                Ends: {new Date(election.end_time).toLocaleDateString()}
                              </span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm font-medium">
                                <span className="text-gray-600">Progress</span>
                                <span className="text-[#6B21E8]">{getElectionProgress(election.start_time, election.end_time)}%</span>
                              </div>
                              <Progress 
                                value={getElectionProgress(election.start_time, election.end_time)} 
                                className="h-3"
                              />
                            </div>

                            <Button 
                              onClick={() => navigate(`/vote/${election.id}`)}
                              className="w-full bg-gradient-to-r from-[#6B21E8] to-purple-600 hover:from-[#6B21E8]/90 hover:to-purple-600/90 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                              Vote Now
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {!isAuthenticated && activeElections.length > 0 && (
          <section className="py-16 w-full bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-indigo-600/10 backdrop-blur-sm">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-left mb-12"
                >
                  <h2 className="text-4xl font-bold mb-4 text-gray-900">Live Elections</h2>
                  <p className="text-xl text-gray-600 max-w-3xl">
                    Participate in ongoing elections and make your voice heard in real-time. 
                    Each vote is encrypted, verified, and recorded securely for maximum integrity.
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {activeElections.map((election, index) => (
                    <motion.div
                      key={election.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="bg-gradient-to-r from-[#6B21E8] to-purple-600 p-3 rounded-xl">
                              <Vote className="h-6 w-6 text-white" />
                            </div>
                            {election.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-3 text-gray-600">
                            <Clock className="h-5 w-5" />
                            <span className="font-medium">
                              Ends: {new Date(election.end_time).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm font-medium">
                              <span className="text-gray-600">Progress</span>
                              <span className="text-[#6B21E8]">{getElectionProgress(election.start_time, election.end_time)}%</span>
                            </div>
                            <Progress 
                              value={getElectionProgress(election.start_time, election.end_time)} 
                              className="h-3"
                            />
                          </div>

                          <Button 
                            onClick={() => navigate('/auth')}
                            className="w-full bg-gradient-to-r from-[#6B21E8] to-purple-600 hover:from-[#6B21E8]/90 hover:to-purple-600/90 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            Sign In to Vote
                            <ArrowRight className="ml-2 h-5 w-5" />
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <StatsSection />

        <HowItWorks />

        <FAQSection />
      </main>



    </div>
  );
};
  
const getElectionProgress = (startTime: string, endTime: string): number => {
  const startMs = new Date(startTime).valueOf();
  const endMs = new Date(endTime).valueOf();
  const nowMs = Date.now();

  if (nowMs < startMs) return 0;
  if (nowMs > endMs) return 100;

  const totalMs = endMs - startMs;
  const elapsedMs = nowMs - startMs;
  return Math.round((elapsedMs / totalMs) * 100);
};

export default Index;
