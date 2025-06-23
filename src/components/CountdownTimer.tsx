import { useState, useEffect } from "react";
import { Clock, Vote, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';

interface CountdownTimerProps {
  startTime: Date;
  endTime: Date;
}

const CountdownTimer = ({ startTime, endTime }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get server time and calculate difference
    const syncServerTime = async () => {
      try {
        const { data, error } = await supabase.rpc('get_server_time');
        if (error) {
          console.error('Failed to sync server time:', error);
          // Fallback to client time if server time fails
          setServerTime(new Date());
        } else {
          setServerTime(new Date(data));
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to sync server time:', error);
        setServerTime(new Date());
        setIsLoading(false);
      }
    };

    // Initial sync
    syncServerTime();

    // Sync every minute
    const syncInterval = setInterval(syncServerTime, 60000);

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      
      if (now < startTime) {
        setStatus('upcoming');
        const diff = startTime.getTime() - now.getTime();
        return formatTimeLeft(diff);
      } else if (now >= startTime && now <= endTime) {
        setStatus('live');
        const diff = endTime.getTime() - now.getTime();
        return formatTimeLeft(diff);
      } else {
        setStatus('ended');
        return '';
      }
    };

    const formatTimeLeft = (ms: number) => {
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (seconds > 0) parts.push(`${seconds}s`);

      return parts.join(' ');
    };

    if (!isLoading) {
      setTimeLeft(calculateTimeLeft());
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, endTime, isLoading]);

  if (isLoading) {
    return (
      <Card className="bg-muted/5 border">
        <CardContent className="p-6">
          <div className="text-center">
            <Clock className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Syncing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderContent = () => {
    switch (status) {
      case 'ended':
        return (
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-muted-foreground">Election Status</p>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-xl font-semibold text-red-600">Voting Ended</h3>
            </div>
            <p className="text-sm text-muted-foreground">Results will be announced soon</p>
          </div>
        );
      case 'live':
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Vote className="h-5 w-5 text-green-500" />
              <p className="text-lg font-medium text-green-600">Voting is Live</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Time Remaining</p>
              <h3 className="text-3xl font-bold tracking-tight">{timeLeft}</h3>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-md p-3 mt-4">
              <p className="text-sm text-green-800">Cast your vote now</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <p className="text-lg font-medium text-orange-600">Upcoming Election</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Starts In</p>
              <h3 className="text-3xl font-bold tracking-tight">{timeLeft}</h3>
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="bg-muted/5 border">
      <CardContent className="p-6">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default CountdownTimer;
