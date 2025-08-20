import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Vote, Calendar, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchPlatformStats, PlatformStats } from "@/lib/api/stats";

const StatsSection = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const platformStats = await fetchPlatformStats();
        setStats(platformStats);
      } catch (error) {
        console.error('Failed to load stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const statsData = [
    {
      icon: Vote,
      value: loading ? "..." : formatNumber(stats?.totalVotes || 0),
      label: "Total Votes Cast",
      description: "Secure votes processed",
      color: "from-purple-500 to-purple-600",
      bgColor: "from-purple-50 to-purple-100",
    },
    {
      icon: Users,
      value: loading ? "..." : formatNumber(stats?.totalUsers || 0),
      label: "Registered Users",
      description: "Active platform users",
      color: "from-blue-500 to-blue-600",
      bgColor: "from-blue-50 to-blue-100",
    },
    {
      icon: Calendar,
      value: loading ? "..." : (stats?.activeElections || 0),
      label: "Active Elections",
      description: "Currently running",
      color: "from-emerald-600 to-teal-600",
      bgColor: "from-emerald-50 to-teal-50",
    },
    {
      icon: CheckCircle,
      value: loading ? "..." : (stats?.totalElections || 0),
      label: "Completed Elections",
      description: "Successfully finished",
      color: "from-orange-500 to-orange-600",
      bgColor: "from-orange-50 to-orange-100",
    },
  ];

  return (
    <section className="py-16 w-full bg-gradient-to-r from-gray-900/5 via-purple-900/5 to-blue-900/5 backdrop-blur-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
      <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-bold mb-4 text-gray-900">
              Platform Statistics
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Real-time data from our secure voting platform. All statistics are 
              updated automatically from live database queries.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm group">
                    <CardContent className="p-8 text-center">
                      <div className={`bg-gradient-to-r ${stat.bgColor} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}>
                        <div className={`bg-gradient-to-r ${stat.color} p-3 rounded-xl`}>
                          <Icon className="h-7 w-7 text-white" />
        </div>
              </div>
                      <div className={`text-4xl font-bold mb-2 text-gray-900 ${loading ? 'animate-pulse' : ''}`}>
                        {stat.value}
              </div>
                      <div className="text-lg font-semibold mb-1 text-gray-800">
                        {stat.label}
              </div>
                      <p className="text-gray-600 text-sm">
                        {stat.description}
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

export default StatsSection; 