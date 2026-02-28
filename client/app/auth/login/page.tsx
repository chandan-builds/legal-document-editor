'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await login(email, password);
            router.push('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4">
            <div className="w-full max-w-md">
                {/* Logo / Brand */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30 mb-4">
                        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Legal Editor</h1>
                    <p className="text-sm text-slate-400 mt-1">Collaborative Contract Platform</p>
                </div>

                {/* Card */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="you@company.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            Don&apos;t have an account?{' '}
                            <Link href="/auth/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
