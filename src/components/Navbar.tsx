import React from 'react';
import { useFinancials } from '../state/FinancialContext';
import { Logo } from './Logo';
import {
  Sun,
  Moon,
  Zap,
  Bell,
  Bot,
  Menu,
  User,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    userProfile,
    updateProfile,
    activeTab,
    setActiveTab,
    pendingTransactions,
    setIsAuthModalOpen,
    setIsQuickAddModalOpen,
    setIsPendingReviewOpen,
    setIsMobileMenuOpen,
  } = useFinancials();

  const isDark = userProfile.themeMode === 'dark';

  return (
    <header className={`sticky top-0 z-30 w-full border-b backdrop-blur-md px-3 sm:px-6 py-2.5 transition-colors ${
      isDark
        ? 'border-zinc-800/80 bg-[#09090B]/90 text-zinc-100'
        : 'border-zinc-200/90 bg-white/90 text-zinc-900 shadow-xs'
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Logo className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-500 shrink-0" />
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className={`font-extrabold text-base sm:text-lg tracking-tight font-sans truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                My Paisa
              </span>
              <span className="hidden xs:inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                v2.5
              </span>
            </div>
            <p className="hidden sm:block text-[10px] text-zinc-500 font-medium tracking-wide uppercase">
              Your AI Financial Assistant <span className="text-zinc-400">•</span> SIHFZ
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Capture Button */}
          <button
            onClick={() => setIsQuickAddModalOpen(true)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            title="Quick Log Income/Expense"
          >
            <Zap className="h-3.5 w-3.5 shrink-0" />
            <span className="inline text-[11px] sm:text-xs">+ Log</span>
          </button>

          {/* Pending Notification Bell Badge */}
          <button
            onClick={() => setIsPendingReviewOpen(true)}
            className={`relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-colors ${
              pendingTransactions.length > 0
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                : isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
            title="Pending Review Items"
          >
            <Bell className="h-4 w-4" />
            {pendingTransactions.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-zinc-950 font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {pendingTransactions.length}
              </span>
            )}
          </button>

          {/* Account Profile Sync Button (Desktop) */}
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className={`hidden sm:flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 border text-xs font-bold transition-all ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700'
                : 'border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
            title="Account & Sync Settings"
          >
            {userProfile.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                className="h-6 w-6 rounded-full object-cover border border-emerald-500/40"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/40 bg-zinc-800 text-zinc-400">
                <User className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="hidden lg:inline text-xs truncate max-w-[90px]">@{userProfile.username || 'user'}</span>
          </button>

          {/* Ask AI quick pill button */}
          <button
            onClick={() => setActiveTab('ai_assistant')}
            className={`hidden md:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'ai_assistant'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : isDark
                ? 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:text-white'
                : 'bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 hover:text-zinc-900'
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-500" />
            <span>AI Advisor</span>
          </button>

          {/* Dark / Light Theme Toggle */}
          <button
            onClick={() =>
              updateProfile({
                themeMode: isDark ? 'light' : 'dark',
              })
            }
            title="Toggle Light/Dark Theme"
            className={`hidden xs:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-colors ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-600" />
            )}
          </button>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className={`flex md:hidden h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border transition-all ${
              isDark
                ? 'border-zinc-800 bg-zinc-900 text-emerald-400 hover:bg-zinc-800'
                : 'border-zinc-200 bg-zinc-100 text-emerald-600 hover:bg-zinc-200'
            }`}
            title="Open Main Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
