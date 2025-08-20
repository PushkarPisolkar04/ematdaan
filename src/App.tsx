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
import Results from '@/pages/Results';
import Profile from '@/pages/Profile';

import ElectionsList from '@/pages/ElectionsList';
import Candidates from '@/pages/Candidates';
import InvitationManager from '@/components/admin/InvitationManager';
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
            
            {/* Redirect old routes */}
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/register" element={<Navigate to="/auth" replace />} />
            <Route path="/saas" element={<Navigate to="/" replace />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="student">
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
            

            
            <Route path="/results/:electionId" element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/elections" element={
              <ProtectedRoute>
                <ElectionsList />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/elections/:electionId/candidates" element={
              <ProtectedRoute requiredRole="admin">
                <Candidates />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/invitations" element={
              <ProtectedRoute requiredRole="admin">
                <InvitationManager />
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
