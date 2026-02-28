'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/useAuth';

export default function ClientErrorBoundary({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary>
            <AuthProvider>
                {children}
            </AuthProvider>
        </ErrorBoundary>
    );
}
