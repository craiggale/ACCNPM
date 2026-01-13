import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import ScenarioPlanner from './pages/ScenarioPlanner';
import ProjectDashboard from './pages/ProjectDashboard';
import AnalyticsEngine from './pages/AnalyticsEngine';
import ResourceManagement from './pages/ResourceManagement';
import Admin from './pages/Admin';
import LaunchStatus from './pages/LaunchStatus';
import KVITracking from './pages/KVITracking';
import Initiatives from './pages/Initiatives';
import MyAccount from './pages/MyAccount';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#888'
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Main app routes
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RealTimeProvider>
              <AppProvider>
                <Layout>
                  <Routes>
                    <Route path="/" element={<ScenarioPlanner />} />
                    <Route path="/track" element={<ProjectDashboard />} />
                    <Route path="/launch-status" element={<LaunchStatus />} />
                    <Route path="/learn" element={<AnalyticsEngine />} />
                    <Route path="/resources" element={<ResourceManagement />} />
                    <Route path="/kvi-tracking" element={<KVITracking />} />
                    <Route path="/initiatives" element={<Initiatives />} />
                    <Route path="/my-account" element={<MyAccount />} />
                    <Route path="/admin" element={<Admin />} />
                  </Routes>
                </Layout>
              </AppProvider>
            </RealTimeProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
