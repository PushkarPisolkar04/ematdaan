import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Users, Vote, Clock, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { supabase } from '@/lib/supabase';

interface SiteStatsData {
  registered_voters: number;
  total_votes: number;
  turnout: number;
  avg_confirmation_time: number;
  security_score: number;
}

export default function StatsSection() {
  const [stats, setStats] = useState<SiteStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 0.5], [100, 0]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .from('site_stats')
          .select('*')
          .single();
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error fetching site stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <section ref={containerRef} className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
      </section>
    );
  }

  return (
    <section ref={containerRef} className="py-20 bg-gradient-to-b from-background to-muted/20">
      <motion.div
        style={{ opacity, y }}
        className="container mx-auto px-4"
      >
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Trust in Numbers</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real-time statistics from our secure e-voting platform. Every vote is encrypted, verified, and immutably recorded.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="text-center h-full hover:shadow-lg transition-shadow duration-300 bg-white dark:bg-zinc-900">
            <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-3 divide-y-0 sm:divide-y-0 sm:divide-x divide-muted-foreground/10 gap-0">
              <div className="px-4 py-4 flex flex-col items-center justify-center">
                <Users className="h-8 w-8 text-blue-500 mb-2" />
                <div className="text-2xl font-bold">{stats?.registered_voters?.toLocaleString() ?? 0}</div>
                <div className="text-xs text-muted-foreground">Registered Voters</div>
              </div>
              <div className="px-4 py-4 flex flex-col items-center justify-center">
                <Vote className="h-8 w-8 text-green-500 mb-2" />
                <div className="text-2xl font-bold">{stats?.total_votes?.toLocaleString() ?? 0}</div>
                <div className="text-xs text-muted-foreground">Votes Cast</div>
              </div>
              <div className="px-4 py-4 flex flex-col items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-purple-500 mb-2" />
                <div className="text-2xl font-bold">{stats?.security_score ?? 0}%</div>
                <div className="text-xs text-muted-foreground">Security Rating</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </section>
  );
} 