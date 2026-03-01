'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'CLIENT' | 'VENDOR' | 'ADMIN';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.push('/auth/login');
            return;
        }

        if (requiredRole && user.role !== requiredRole && user.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
        }

        setAuthorized(true);
    }, [user, isLoading, requiredRole, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-slate-400">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) return null;

    return <>{children}</>;
}
