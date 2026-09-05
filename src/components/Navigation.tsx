import React from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Target,
  Users,
  Bot,
  BarChart3,
  Trophy,
  Settings,
  Package,
  Menu,
  Plus,
  X,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  Zap,
  Bell,
  UserCheck,
  WalletCards
} from 'lucide-react';
import { useBackHandler } from '../lib/useBackButton';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
}

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    budgets,
    borrowLend,
    userProfile,
    updateProfile,
    memories,
    trackedItems,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsQuickAddModalOpen,
    setIsPendingReviewOpen,
    setIsAuthModalOpen,
    pendingTransactions,
  } = useFinancials();

  const isDark = userProfile.themeMode === 'dark';

  useBackHandler(isMobileMenuOpen, () => setIsMobileMenuOpen(false));

  // Active notifications count
  const warningBudgetsCount = budgets.filter((b) => b.spentAmount >= b.limitAmount * (b.alertThresholdPercent / 100)).length;
  const activeDebtsCount = borrowLend.filter((b) => b.status === 'active').length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview & Net Worth' },
    { id: 'accounts', label: 'Accounts', icon: WalletCards, description: 'Banks, Wallets & Cash' },
    { id: 'transactions', label: 'Transactions', icon: Receipt, description: 'Income & Expense Logs' },
    {
      id: 'items',
      label: 'Item Tracker',
      icon: Package,
      badge: trackedItems.length > 0 ? `${trackedItems.length}` : undefined,
      description: 'Snacks & Supplies Stock',
    },
    {
      id: 'budgets',
      label: 'Budgets',
      icon: PieChart,
      badge: warningBudgetsCount > 0 ? `${warningBudgetsCount}` : undefined,
      description: 'Category Spending Limits',
    },
    { id: 'goals', label: 'Savings Goals', icon: Target, description: 'Target Bucket Savings' },
    {
      id: 'borrow_lend',
      label: 'Borrow & Lend',
      icon: Users,
      badge: activeDebtsCount > 0 ? `${activeDebtsCount}` : undefined,
      description: 'Debts & Loans Tracker',
    },
    { id: 'memories', label: 'Memory Vault', icon: Trophy, badge: memories.length > 0 ? `${memories.length}` : undefined, description: 'Financial Milestone Notes' },
    { id: 'ai_assistant', label: 'AI Advisor', icon: Bot, badge: 'AI', description: 'Smart Money Advice' },
    { id: 'analytics', label: 'Analytics & Export', icon: BarChart3, description: 'Reports, CSV & PDF Export' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'Currency & Preferences' },
  ];

  // Core 4 items for mobile bottom bar
  const mobileBottomItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'History', icon: Receipt },
    { id: 'items', label: 'Items', icon: Package },
    { id: 'ai_assistant', label: 'AI Pilot', icon: Bot, badge: 'AI' },
  ];

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className={`hidden md:flex w-64 flex-col border-r p-5 shrink-0 min-h-[calc(100vh-65px)] transition-colors ${
        isDark ? 'border-zinc-800/80 bg-[#09090B]' : 'border-zinc-200 bg-zinc-50/90 text-zinc-800'
      }`}>
        <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase px-3 mb-3">
          Navigation Menu
        </div>

        <nav className="flex flex-col gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? isDark
                      ? 'bg-zinc-800/90 text-emerald-400 border border-zinc-700/60 shadow-md shadow-black/40'
                      : 'bg-white text-emerald-600 border border-zinc-200 shadow-xs font-bold'
                    : isDark
                    ? 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                    : 'text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold ${
                      item.id === 'ai_assistant'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Brand Tag */}
        <div className={`mt-auto pt-5 border-t text-center ${isDark ? 'border-zinc-800/60' : 'border-zinc-200'}`}>
          <div className={`rounded-2xl p-3.5 text-left border ${
            isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-2xs'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className={`text-xs font-extrabold ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                Offline Engine
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
              SIHFZ Architecture v3.2 with local PWA storage.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (5 Primary Buttons: Home, History, + Log, Items, Menu) */}
      <nav className={`mp-bottom-nav mp-safe-bottom fixed bottom-0 left-0 right-0 z-40 flex md:hidden items-center justify-around border-t py-1.5 px-2 backdrop-blur-xl transition-colors ${
        isDark ? 'border-zinc-800/90 bg-[#09090B]/95 text-zinc-300' : 'border-zinc-200 bg-white/95 text-zinc-700 shadow-lg'
      }`}>
        {/* Core 2 Tabs */}
        {mobileBottomItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-bold transition-all ${
                isActive ? 'text-emerald-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
              <span className="mt-0.5 tracking-tight text-[10px]">{item.label}</span>
            </button>
          );
        })}

        {/* Center Prominent Quick Add Button */}
        <button
          onClick={() => setIsQuickAddModalOpen(true)}
          className="flex flex-col items-center justify-center -mt-4 shrink-0"
          title="Quick Capture"
        >
          <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-400 text-zinc-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-[#09090B] active:scale-95 transition-transform">
            <Plus className="h-6 w-6 stroke-[3]" />
          </div>
          <span className="text-[9px] font-extrabold text-amber-500 mt-0.5 uppercase tracking-wider">+ Log</span>
        </button>

        {/* Item Tracker Tab */}
        {mobileBottomItems.slice(2, 3).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-bold transition-all ${
                isActive ? 'text-amber-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-amber-500' : 'text-zinc-400'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-amber-500 px-0.5 text-[7px] font-extrabold text-black">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight text-[10px]">{item.label}</span>
            </button>
          );
        })}

        {/* Hamburger Drawer Trigger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2 text-[10px] font-bold transition-all ${
            isMobileMenuOpen ? 'text-emerald-500' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Menu className="h-5 w-5 text-zinc-400" />
          <span className="mt-0.5 tracking-tight text-[10px]">Menu</span>
        </button>
      </nav>

      {/* Mobile Hamburger Drawer Sheet Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content Panel */}
          <div
            className={`relative w-full max-w-xs h-full flex flex-col p-5 overflow-y-auto shadow-2xl transition-all border-l ${
              isDark
                ? 'bg-[#09090B] border-zinc-800 text-zinc-100'
                : 'bg-white border-zinc-200 text-zinc-900'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                {userProfile.avatarUrl ? (
                  <img
                    src={userProfile.avatarUrl}
                    alt={userProfile.name}
                    className="h-10 w-10 rounded-full object-cover border-2 border-emerald-500/50"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500/50 bg-zinc-800 text-zinc-400">
                    <UserCheck className="h-5 w-5" />
                  </span>
                )}
                <div>
                  <h3 className="text-sm font-extrabold truncate max-w-[120px]">{userProfile.name}</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">@{userProfile.username || 'alex'}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Theme Toggle */}
                <button
                  onClick={() =>
                    updateProfile({
                      themeMode: isDark ? 'light' : 'dark',
                    })
                  }
                  className={`p-2 rounded-xl border ${
                    isDark ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-zinc-100 border-zinc-300 text-indigo-600'
                  }`}
                  title="Toggle Theme"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                {/* Close Drawer Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800/40 text-zinc-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar inside Drawer */}
            <div className="my-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsQuickAddModalOpen(true);
                }}
                className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <Zap className="h-4 w-4" />
                <span>+ Quick Log</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-200' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
                }`}
              >
                <UserCheck className="h-4 w-4 text-emerald-500" />
                <span>Sync Account</span>
              </button>
            </div>

            {/* Notification Alert Pill if pending */}
            {pendingTransactions.length > 0 && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsPendingReviewOpen(true);
                }}
                className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center justify-between animate-pulse"
              >
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <span>{pendingTransactions.length} Pending Items Review</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {/* Menu Sections */}
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
              All Sections
            </div>

            <div className="flex flex-col gap-1.5 mb-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isActive
                        ? isDark
                          ? 'bg-zinc-800/90 border-emerald-500/40 text-emerald-400 font-bold'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-700 font-bold'
                        : isDark
                        ? 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-800'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-zinc-800/40 text-zinc-400'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-extrabold flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500">{item.description}</p>
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer Branding */}
            <div className="mt-auto pt-4 border-t border-zinc-800/60 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-500 mb-1">
                <ShieldCheck className="h-4 w-4" />
                <span>My Paisa v3.2</span>
              </div>
              <p className="text-[10px] text-zinc-500">
                Developed by SIHFZ • Progressive Web App
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
