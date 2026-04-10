import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent" />
  </div>
);

/** 任何登入用戶都可進入 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** admin 或 manager 可進入（後台） */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isManager) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** 只有最高權限 admin 可進入（用戶管理） */
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

/** admin、manager 或 consultant 可進入（顧問後台） */
export function ConsultantRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isManager, isConsultant, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isManager && !isConsultant) return <Navigate to="/" replace />;
  return <>{children}</>;
}
