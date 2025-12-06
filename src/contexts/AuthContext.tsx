"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const checkSession = useCallback(async () => {
        try {
            // Verify=1 ensures upstream token validity check
            const res = await fetch("/api/kurasi/session?verify=1");
            if (res.ok) {
                const data = await res.json();
                setIsAuthenticated(!!data.loggedIn);
                setUser(data.label || null);

                // If the check returned not logged in, but we have local state? 
                // Actually the API returns { loggedIn: false } if token invalid.
                // We just rely on state sync.
            } else {
                // If API error, assume logged out
                setIsAuthenticated(false);
                setUser(null);
            }
        } catch (e) {
            console.error("Session check failed", e);
            setIsAuthenticated(false);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial check
        checkSession();

        // 5-minute interval to re-verify session
        const interval = setInterval(() => {
            if (!document.hidden) {
                checkSession();
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [checkSession]);

    const login = async (username: string, password: string) => {
        try {
            const res = await fetch("/api/kurasi/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.status === "SUCCESS") {
                await checkSession();
                return { success: true };
            } else {
                return { success: false, error: data.errorMessage || "Login failed" };
            }
        } catch (error: any) {
            return { success: false, error: error.message || "Network error" };
        }
    };

    const logout = async () => {
        try {
            await fetch("/api/kurasi/logout", { method: "POST" });
            setUser(null);
            setIsAuthenticated(false);
            router.refresh();
            router.push("/");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, checkSession }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
