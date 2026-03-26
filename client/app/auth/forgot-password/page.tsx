'use client';

import { useState } from 'react';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/services/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 overflow-hidden relative">
            <div className="auth-blob w-72 h-72 bg-amber-500 top-[-10%] left-[10%]" style={{ animationDelay: '1s' }} />
            <div className="auth-blob w-80 h-80 bg-indigo-600 bottom-[-15%] right-[-5%]" style={{ animationDelay: '3s' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 auth-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/30 mb-5">
                        <Mail className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {sent ? 'Check your email' : 'Forgot password?'}
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        {sent ? 'We sent a reset link to your inbox' : 'Enter your email and we\'ll send a reset link'}
                    </p>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-8">
                    {sent ? (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-full mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-sm text-slate-300 mb-6">
                                If <span className="font-medium text-white">{email}</span> is registered, you'll receive a password reset link shortly.
                            </p>
                            <Link href="/auth/login"
                                className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                                <ArrowLeft className="w-4 h-4" /> Back to sign in
                            </Link>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-5 flex items-start gap-3">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                    {error}
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="you@company.com" required autoComplete="email" />
                                </div>
                                <button type="submit" disabled={isLoading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:via-orange-500 hover:to-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 auth-gradient-btn">
                                    {isLoading ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors">
                                    <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
