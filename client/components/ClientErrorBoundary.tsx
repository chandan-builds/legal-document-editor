'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function ClientErrorBoundary({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}
