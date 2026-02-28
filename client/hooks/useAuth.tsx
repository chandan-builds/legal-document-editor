'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '@/services/api';

export type UserRole = 'CLIENT' | 'VENDOR' | 'ADMIN';

export interface AuthUser {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    avatarUrl?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
}

interface RegisterData {
    email: string;
    password: string;
    displayName: string;
    role: UserRole;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // On mount, check if we have valid tokens
    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser({
                        id: data.id,
                        email: data.email,
                        displayName: data.displayName,
                        role: data.role,
                        avatarUrl: data.avatarUrl,
                    });
                } catch {
                    // Token invalid/expired — clear
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);

        setUser({
            id: data.user.id,
            email: data.user.email,
            displayName: data.user.displayName,
            role: data.user.role,
        });
    }, []);

    const register = useCallback(async (registerData: RegisterData) => {
        await api.post('/auth/register', registerData);
        // Auto-login after registration
        await login(registerData.email, registerData.password);
    }, [login]);

    const logout = useCallback(async () => {
        const refreshToken = localStorage.getItem('refresh_token');
        try {
            if (refreshToken) {
                await api.post('/auth/logout', { refreshToken });
            }
        } catch {
            // Ignore errors during logout
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
