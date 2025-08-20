import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Admin from '@/pages/Admin';
import Vote from '@/pages/Vote';
import VerifyVote from '@/pages/VerifyVote';
import VoteReceipt from '@/pages/VoteReceipt';
import Results from '@/pages/Results';
import Profile from '@/pages/Profile';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Redirect old routes */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/register" element={<Navigate to="/auth" replace />} />
            <Route path="/saas" element={<Navigate to="/" replace />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            } />
            
            <Route path="/vote/:electionId" element={
              <ProtectedRoute requiredRole="student">
                <Vote />
              </ProtectedRoute>
            } />
            
            <Route path="/verify-vote/:receipt" element={
              <ProtectedRoute>
                <VerifyVote />
              </ProtectedRoute>
            } />
            
            <Route path="/vote-receipt/:receiptId" element={
              <ProtectedRoute>
                <VoteReceipt />
              </ProtectedRoute>
            } />
            
            <Route path="/results/:electionId" element={<Results />} />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
