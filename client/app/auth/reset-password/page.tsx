'use client';

import { useState, useMemo } from 'react';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { Suspense } from 'react';

function usePasswordStrength(password: string) {
    return useMemo(() => {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            number: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };
        score = Object.values(checks).filter(Boolean).length;
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
        const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
        return { score, label: labels[score] || '', color: colors[score] || '', checks };
    }, [password]);
}

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const strength = usePasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (strength.score < 4) {
            setError('Password is not strong enough.');
            return;
        }
        if (!token) {
            setError('Missing reset token. Please use the link from your email.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            setTimeout(() => router.push('/auth/login'), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Reset failed. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 overflow-hidden relative">
            <div className="auth-blob w-72 h-72 bg-emerald-500 top-[-10%] right-[5%]" style={{ animationDelay: '0s' }} />
            <div className="auth-blob w-80 h-80 bg-indigo-600 bottom-[-12%] left-[-8%]" style={{ animationDelay: '2s' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8 auth-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded-2xl shadow-lg shadow-emerald-500/30 mb-5">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {success ? 'Password Reset!' : 'Set new password'}
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        {success ? 'Redirecting to login...' : 'Choose a strong new password'}
                    </p>
                </div>

                <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-2xl p-8 auth-fade-in" style={{ animationDelay: '0.2s' }}>
                    {success ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-8 h-8 text-emerald-400" />
                            </div>
                            <p className="text-sm text-slate-300">Your password has been reset. Redirecting to login...</p>
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
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="Min. 8 characters" required minLength={8} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1" tabIndex={-1}>
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {password && (
                                        <div className="mt-2.5">
                                            <div className="flex gap-1.5 mb-1">
                                                {[1, 2, 3, 4, 5].map((i) => (
                                                    <div key={i} className="strength-segment flex-1"
                                                        style={{ backgroundColor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : 'border-white/[0.08]'}`}
                                        placeholder="Re-enter password" required />
                                </div>

                                <button type="submit" disabled={isLoading}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 via-cyan-600 to-emerald-600 hover:from-emerald-500 hover:via-cyan-500 hover:to-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 auth-gradient-btn">
                                    {isLoading ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting...</>
                                    ) : (
                                        <>Reset Password <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            </form>
                            <div className="mt-6 text-center">
                                <Link href="/auth/login" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
                                    Back to sign in
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
