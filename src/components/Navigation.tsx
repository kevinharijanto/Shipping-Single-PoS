"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeSwitcher from "./ThemeSwitcher";

import { useAuth } from "@/contexts/AuthContext";

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(savedState === "true");
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  // Login modal state
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navItems = [
    {
      href: "/", label: "Dashboard", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      href: "/orders", label: "Orders", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      )
    },
    {
      href: "/customers", label: "Customers", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: "/buyers", label: "Recipients", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: "/quote", label: "Shipping Quote", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: "/shipments", label: "Kurasi Shipments", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      href: "/shipments/temp", label: "Pending Shipments", icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const result = await login(username, password);
    setIsLoggingIn(false);

    if (result.success) {
      setShowLogin(false);
      setUsername("");
      setPassword("");
    } else {
      setLoginError(result.error || "Login failed");
    }
  };

  // Collapsed AuthSection for sidebar
  const AuthSection = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className={`${collapsed ? 'px-2' : 'px-4'} py-3 mt-auto border-t border-gray-100 dark:border-gray-800`}>
      {isLoading ? (
        <div className={`text-xs text-gray-400 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? '...' : 'Loading...'}
        </div>
      ) : isAuthenticated ? (
        collapsed ? (
          // Collapsed view - just icons
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={logout}
              className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <ThemeSwitcher />
          </div>
        ) : (
          // Expanded view
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 mb-0.5">
                Logged in as
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {user || "User"}
              </div>
              <button
                onClick={logout}
                className="mt-1 text-xs text-red-500 hover:text-red-600 dark:text-red-400 font-medium"
              >
                Sign Out
              </button>
            </div>
            <div className="flex-shrink-0">
              <ThemeSwitcher />
            </div>
          </div>
        )
      ) : (
        collapsed ? (
          // Collapsed login button
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setShowLogin(true)}
              className="p-2 text-primary hover:bg-primary-light/10 rounded-lg transition-colors"
              title="Log in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
            <ThemeSwitcher />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => setShowLogin(true)}
              className="w-full flex items-center justify-center px-4 py-1.5 border border-primary text-primary hover:bg-primary-light/10 rounded-md text-sm font-medium transition-colors"
            >
              Log in
            </button>
            <div className="flex justify-center">
              <ThemeSwitcher />
            </div>
          </div>
        )
      )}
    </div>
  );

  // Collapse toggle button
  const CollapseButton = () => (
    <button
      onClick={toggleCollapse}
      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)] transition-colors"
      title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <svg
        className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
      </svg>
    </button>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 h-14 flex items-center justify-between px-4">
        <button
          type="button"
          className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]"
          aria-controls="mobile-sidebar"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--text-main)]">Kurasyit</h1>

      </div>

      {/* Desktop sidebar (sticky) */}
      <aside
        className={`hidden md:flex h-screen sticky top-0 border-r border-[var(--border-color)] bg-sidebar transition-all duration-200 ease-in-out ${isCollapsed ? 'w-16' : 'w-64'
          }`}
      >
        <div className="flex h-full w-full flex-col">
          {/* Header with title and collapse button */}
          <div className={`py-4 flex items-center ${isCollapsed ? 'px-2 justify-center' : 'px-4 justify-between'}`}>
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-[var(--text-main)]">Kurasyit</h1>
            )}
            <CollapseButton />
          </div>

          <div className={`${isCollapsed ? 'px-1' : 'px-2'} space-y-1 flex-1 overflow-y-auto`}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-2 px-3'} py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                  ? "bg-[rgba(55,53,47,0.08)] text-[var(--text-main)] font-semibold"
                  : "text-[var(--text-muted)] hover:bg-[rgba(55,53,47,0.08)] hover:text-[var(--text-main)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                  }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            ))}
          </div>
          <AuthSection collapsed={isCollapsed} />
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      <div className={`${mobileOpen ? "fixed inset-0 z-50 md:hidden" : "hidden"}`} id="mobile-sidebar">
        <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
        <div
          className={`fixed inset-y-0 left-0 w-64 transform transition-transform duration-200 ease-out bg-sidebar border-r border-[var(--border-color)] custom-scrollbar overflow-y-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex h-full flex-col">
            <div className="px-4 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-main)]">Navigation</h2>
              <button
                className="inline-flex items-center justify-center p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[rgba(0,0,0,0.04)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                onClick={() => setMobileOpen(false)}
              >
                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-medium transition-colors ${pathname === item.href
                    ? "bg-[rgba(55,53,47,0.08)] text-[var(--text-main)] font-semibold"
                    : "text-[var(--text-muted)] hover:bg-[rgba(55,53,47,0.08)] hover:text-[var(--text-main)] dark:hover:bg-[rgba(255,255,255,0.05)]"
                    }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-auto">
              <AuthSection />

            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[60] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowLogin(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-[var(--bg-card)] rounded-lg text-left overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[var(--border-color)] transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full">
              <div className="bg-[var(--bg-card)] px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-[var(--text-main)]" id="modal-title">
                      Login to Kurasi
                    </h3>
                    <div className="mt-2">
                      {loginError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm">
                          {loginError}
                        </div>
                      )}
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Username</label>
                          <input
                            type="text"
                            required
                            className="input w-full"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[var(--text-main)] mb-1">Password</label>
                          <input
                            type="password"
                            required
                            className="input w-full"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                          <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full btn btn-primary sm:col-start-2 sm:text-sm"
                          >
                            {isLoggingIn ? "Logging in..." : "Login"}
                          </button>
                          <button
                            type="button"
                            className="mt-3 w-full btn btn-default sm:mt-0 sm:col-start-1 sm:text-sm"
                            onClick={() => setShowLogin(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}