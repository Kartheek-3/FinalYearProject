import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-background text-primaryText">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
        <span className="text-xs text-secondaryText tracking-wide uppercase font-mono">
          Authenticating SEAM Workspace...
        </span>
      </div>
    );
  }

  // If Firebase is configured and user is not authenticated, redirect to login
  if (isConfigured && !user) {
    const redirectPath = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirectPath}`} replace />;
  }

  return <>{children}</>;
};
