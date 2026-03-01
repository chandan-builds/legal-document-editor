'use client';

import { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
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
    const [showPassword, setShowPassword] = useState(false);
    const [wakingUp, setWakingUp] = useState(false);
    const [hasError, setHasError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setHasError(false);
        setIsLoading(true);
        setWakingUp(false);

        const wakeTimer = setTimeout(() => setWakingUp(true), 5000);

        try {
            await login(email, password);
            router.push('/');
        } catch (err: any) {
            setHasError(true);
            if (!err.response) {
                setError('Server is currently unavailable. Please try again in a moment.');
            } else {
                setError(err.response?.data?.message || 'Invalid email or password.');
            }
        } finally {
            clearTimeout(wakeTimer);
            setIsLoading(false);
            setWakingUp(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 overflow-hidden relative">
            {/* Animated background blobs */}
            <div className="auth-blob w-72 h-72 bg-indigo-600 top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
            <div className="auth-blob w-96 h-96 bg-purple-600 bottom-[-15%] right-[-10%]" style={{ animationDelay: '2s' }} />
            <div className="auth-blob w-64 h-64 bg-cyan-500 top-[40%] right-[10%]" style={{ animationDelay: '4s' }} />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8 auth-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-5">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back</h1>
                    <p className="text-sm text-slate-400 mt-2">Sign in to your Legal Editor account</p>
                </div>

                {/* Card */}
                <div className={`bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-8 auth-fade-in ${hasError ? 'auth-shake' : ''}`} style={{ animationDelay: '0.2s' }}>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-6 flex items-start gap-3">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="auth-fade-in" style={{ animationDelay: '0.3s' }}>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <div className="auth-input rounded-xl">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                                    placeholder="you@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="auth-fade-in" style={{ animationDelay: '0.4s' }}>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-sm font-medium text-slate-300">Password</label>
                                <Link href="/auth/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative auth-input rounded-xl">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-300"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="auth-fade-in" style={{ animationDelay: '0.5s' }}>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 auth-gradient-btn"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        {wakingUp ? 'Waking up server...' : 'Signing in...'}
                                    </>
                                ) : (
                                    <>
                                        Sign In <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>

                        {wakingUp && (
                            <p className="text-xs text-amber-300/80 text-center animate-pulse">
                                ⏳ Server is starting up after inactivity. This may take up to 60 seconds.
                            </p>
                        )}
                    </form>

                    <div className="mt-8 text-center auth-fade-in" style={{ animationDelay: '0.6s' }}>
                        <div className="relative flex items-center gap-4 mb-6">
                            <div className="flex-1 h-px bg-white/[0.08]" />
                            <span className="text-xs text-slate-500 uppercase tracking-wider">New here?</span>
                            <div className="flex-1 h-px bg-white/[0.08]" />
                        </div>
                        <Link
                            href="/auth/register"
                            className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                        >
                            Create an account <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
