'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        this.setState({ errorInfo });
        // In production, send to error tracking service (e.g., Sentry)
        console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
                    <div className="max-w-lg w-full bg-white rounded-xl shadow-lg border border-red-100 overflow-hidden">
                        <div className="bg-red-600 px-6 py-4">
                            <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                Something went wrong
                            </h2>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                An unexpected error occurred in the editor. Your document data is safe —
                                this error is limited to the user interface.
                            </p>
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-[400px] overflow-y-auto">
                                <code className="text-xs text-red-700 break-words whitespace-pre-wrap font-mono">
                                    <div className="font-bold text-sm mb-2">{this.state.error?.message || 'Unknown error'}</div>
                                    <div className="text-gray-600 mb-2">Stack Trace:</div>
                                    {this.state.error?.stack}
                                    <div className="text-gray-600 mt-4 mb-2">Component Stack:</div>
                                    {this.state.errorInfo?.componentStack}
                                </code>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Reload Page
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
