'use client';

import DashboardPage from './dashboard/page';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  );
}
