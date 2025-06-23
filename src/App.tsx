import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { initializeSessionManager } from '@/lib/session';
import { initializeSocket, disconnectSocket } from '@/lib/socket';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { checkConnection } from '@/lib/metamask';
import Layout from '@/components/Layout';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Vote from '@/pages/Vote';
import Admin from '@/pages/Admin';
import VerifyVote from '@/pages/VerifyVote';
import VoteReceipt from '@/pages/VoteReceipt';
import Results from '@/pages/Results';
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function App() {
  const location = useLocation();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check and restore MetaMask connection
        await checkConnection();
        
    // Initialize session management
    const cleanup = initializeSessionManager();

    // Initialize WebSocket
    initializeSocket();

    // Handle FAQ scroll on navigation
    if (location.search.includes('scrollTo=faqs')) {
      setTimeout(() => {
        document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }

    return () => {
      cleanup();
      disconnectSocket();
    };
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();
  }, [location]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/vote/:electionId" element={<Vote />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/vote-receipt" element={<VoteReceipt />} />
            <Route path="/vote-receipt/:receiptId" element={<VoteReceipt />} />
            <Route path="/verify-vote/:receiptId?" element={<VerifyVote />} />
            <Route path="/results" element={<Results />} />
            {/* Redirect legacy routes */}
            <Route path="/verify" element={<VerifyVote />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
