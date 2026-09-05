import React, { useCallback, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { useKeyboardInset, useScrollFocusedIntoView } from './lib/useKeyboard';
import { runTopBackHandler } from './lib/useBackButton';
import { FinancialProvider, useFinancials } from './state/FinancialContext';
import { Navbar } from './components/Navbar';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { AccountsView } from './components/AccountsView';
import { AccountSetupModal } from './components/AccountSetupModal';
import { TransactionsView } from './components/TransactionsView';
import { BudgetsView } from './components/BudgetsView';
import { GoalsView } from './components/GoalsView';
import { BorrowLendView } from './components/BorrowLendView';
import { MemoriesView } from './components/MemoriesView';
import { AiAssistantView } from './components/AiAssistantView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { ItemTrackerView } from './components/ItemTrackerView';
import { AuthModal } from './components/AuthModal';
import { QuickLogModal } from './components/QuickLogModal';
import { PendingReviewModal } from './components/PendingReviewModal';
import { SplashScreen } from './components/SplashScreen';
import { PinLockScreen } from './components/PinLockScreen';

const MainContent: React.FC = () => {
  const { activeTab, setActiveTab, userProfile, isLoading, isUnlocked } = useFinancials();
  const [splashDone, setSplashDone] = useState(false);

  // Keeps the bottom nav out of the way of the soft keyboard, and keeps the
  // focused field visible. See src/lib/useKeyboard.ts for the full reasoning.
  useKeyboardInset();
  useScrollFocusedIntoView();
  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  /**
   * Android back button. Order of precedence:
   *   1. Close whatever dismissible surface is open (see lib/useBackButton.ts).
   *   2. Step back to the dashboard from any other tab.
   *   3. Only then actually leave the app.
   *
   * Escape is bound to the same routing so the behaviour is testable in a
   * browser and desktop users get the same "close the top sheet" affordance.
   */
  useEffect(() => {
    const goBack = () => {
      if (runTopBackHandler()) return true;
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
        return true;
      }
      return false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKeyDown);

    let detach: (() => void) | undefined;
    let cancelled = false;
    CapacitorApp.addListener('backButton', () => {
      if (!goBack()) void CapacitorApp.exitApp();
    })
      .then((handle) => {
        if (cancelled) void handle.remove();
        else detach = () => void handle.remove();
      })
      // Not running under Capacitor (plain browser) — Escape still works.
      .catch(() => undefined);

    return () => {
      cancelled = true;
      window.removeEventListener('keydown', onKeyDown);
      detach?.();
    };
  }, [activeTab, setActiveTab]);

  // The splash covers hydration, so the user never sees an empty dashboard
  // full of zeroes while the database is still being read.
  if (!splashDone) {
    return <SplashScreen loading={isLoading} onDone={handleSplashDone} />;
  }

  // BUGFIX: the PIN toggle in Settings previously did nothing at all.
  if (userProfile.isPinProtected && !isUnlocked) {
    return <PinLockScreen />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'accounts':
        return <AccountsView />;
      case 'items':
        return <ItemTrackerView />;
      case 'budgets':
        return <BudgetsView />;
      case 'goals':
        return <GoalsView />;
      case 'borrow_lend':
        return <BorrowLendView />;
      case 'memories':
        return <MemoriesView />;
      case 'ai_assistant':
        return <AiAssistantView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 mp-safe-top ${
        userProfile.themeMode === 'light'
          ? 'theme-light bg-[#F4F5F7] text-slate-800'
          : 'bg-[#09090B] text-zinc-100'
      }`}
    >
      <Navbar />

      <div className="mx-auto flex max-w-7xl">
        <Navigation />

        <main className="mp-shell flex-1 py-4 pb-28 transition-all md:py-6 md:pb-10">
          {renderActiveTab()}
        </main>
      </div>

      {/* Global Modals */}
      <AuthModal />
      <QuickLogModal />
      <PendingReviewModal />
      <AccountSetupModal />
    </div>
  );
};

export default function App() {
  return (
    <FinancialProvider>
      <MainContent />
    </FinancialProvider>
  );
}
