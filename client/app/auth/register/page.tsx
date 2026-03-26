'use client';

import { useState, useMemo } from 'react';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth, UserRole } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
    { value: 'CLIENT', label: 'Client', description: 'Upload contracts, approve vendor changes', icon: '🏢' },
    { value: 'VENDOR', label: 'Vendor', description: 'Review contracts, suggest edits', icon: '🤝' },
];

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

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<UserRole>('CLIENT');
    const [agreedTerms, setAgreedTerms] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [hasError, setHasError] = useState(false);

    const strength = usePasswordStrength(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setHasError(false);

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            setHasError(true);
            return;
        }
        if (strength.score < 4) {
            setError('Password is not strong enough. Include uppercase, lowercase, number, and special character.');
            setHasError(true);
            return;
        }
        if (!agreedTerms) {
            setError('You must agree to the Terms & Conditions.');
            setHasError(true);
            return;
        }

        setIsLoading(true);
        try {
            await register({ email, password, displayName, role });
            router.push('/');
        } catch (err: any) {
            setHasError(true);
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 px-4 py-10 overflow-hidden relative">
            {/* Blobs */}
            <div className="auth-blob w-72 h-72 bg-purple-600 top-[-8%] right-[-5%]" style={{ animationDelay: '0s' }} />
            <div className="auth-blob w-80 h-80 bg-indigo-600 bottom-[-12%] left-[-8%]" style={{ animationDelay: '3s' }} />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-6 auth-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Create Account</h1>
                    <p className="text-sm text-slate-400 mt-1">Join the Legal Editor platform</p>
                </div>

                {/* Card */}
                <div className={`bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl p-8 ${hasError ? 'auth-shake' : ''}`}>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm mb-5 flex items-start gap-3">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="Jane Smith" required minLength={2} />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="jane@company.com" required autoComplete="email" />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-12 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1" tabIndex={-1}>
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {/* Strength meter */}
                            {password && (
                                <div className="mt-2.5">
                                    <div className="flex gap-1.5 mb-1.5">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div key={i} className="strength-segment flex-1"
                                                style={{ backgroundColor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)' }} />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-medium" style={{ color: strength.color }}>{strength.label}</span>
                                        <div className="flex gap-2 text-[10px] text-slate-500">
                                            {Object.entries(strength.checks).map(([key, ok]) => (
                                                <span key={key} className={ok ? 'text-emerald-400' : ''}>{ok ? '✓' : '○'} {key}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`w-full px-4 py-3 bg-white/[0.04] border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${confirmPassword && confirmPassword !== password ? 'border-red-500/50' : 'border-white/[0.08]'}`}
                                placeholder="Re-enter password" required autoComplete="new-password" />
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                            )}
                        </div>

                        {/* Role */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Your Role</label>
                            <div className="grid grid-cols-2 gap-3">
                                {ROLES.map((r) => (
                                    <button key={r.value} type="button" onClick={() => setRole(r.value)}
                                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 ${role === r.value
                                            ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                                            : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'}`}>
                                        <div className="text-xl mb-1">{r.icon}</div>
                                        <div className="text-sm font-semibold text-white">{r.label}</div>
                                        <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{r.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="flex items-start gap-3">
                            <button type="button" onClick={() => setAgreedTerms(!agreedTerms)}
                                className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${agreedTerms
                                    ? 'bg-indigo-600 border-indigo-500' : 'bg-white/[0.04] border-white/[0.12]'}`}>
                                {agreedTerms && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <span className="text-xs text-slate-400 leading-relaxed">
                                I agree to the <a href="#" className="text-indigo-400 hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-400 hover:underline">Privacy Policy</a>
                            </span>
                        </div>

                        {/* Submit */}
                        <div>
                            <button type="submit" disabled={isLoading || !agreedTerms}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-300 flex items-center justify-center gap-2 auth-gradient-btn">
                                {isLoading ? (
                                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account...</>
                                ) : (
                                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-400">
                            Already have an account?{' '}
                            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
