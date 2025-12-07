"use client";

import { useAuth } from "@/contexts/AuthContext";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * A guard component that shows a "Please log in" message when the user is not authenticated.
 * Wraps page content to protect data while keeping page structure visible.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-[var(--text-muted)]">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <svg className="w-16 h-16 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-xl font-medium text-[var(--text-main)]">Please log in</div>
                <p className="text-sm text-[var(--text-muted)]">
                    You need to log in to Kurasi to view this content.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
