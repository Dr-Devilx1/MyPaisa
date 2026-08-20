import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  RefreshCw,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  WifiOff,
} from 'lucide-react';
import { useFinancials } from '../state/FinancialContext';
import { useOnline } from '../lib/useOnline';

/**
 * AI assistant.
 *
 * Rebuilt because the old panel had three problems you would hit immediately:
 *
 *   1. It claimed the device was offline whenever the AI SERVER failed to
 *      answer. In the installed APK no server ships at all, so that message was
 *      permanent — a phone on working Wi-Fi was constantly told to connect to
 *      the internet. Device connectivity and server availability are separate
 *      things and are now shown separately and accurately.
 *
 *   2. The composer was part of the scrolling column, so once the keyboard
 *      opened it scrolled away behind the bottom navigation and you could not
 *      see what you were typing. The message list now scrolls on its own and
 *      the composer is pinned, sitting above the keyboard.
 *
 *   3. Bubbles used fixed dark colours and had no max width, so long replies
 *      ran edge to edge and were unreadable in light mode.
 */

const QUICK_PROMPTS = [
  'Where is most of my money going?',
  'How much did I spend this month?',
  'Can I afford to save more?',
  'What should I cut first?',
];

export const AiAssistantView: React.FC = () => {
  const {
    aiChatMessages,
    sendAiChatMessage,
    isAiThinking,
    requestAiAnalysis,
    aiInsight,
    netWorth,
    monthlyIncome,
    monthlyExpense,
    financialHealthScore,
    userProfile,
  } = useFinancials();

  const isOnline = useOnline();
  const cur = userProfile.currencySymbol;

  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Only auto-scroll when the user is already near the bottom, so reading an
  // older message is not interrupted by a new one arriving.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 160;
    if (nearBottom) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [aiChatMessages, isAiThinking]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || isAiThinking) return;
    void sendAiChatMessage(message);
    setInput('');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const savingsRate = useMemo(
    () => (monthlyIncome > 0 ? Math.round(((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0),
    [monthlyIncome, monthlyExpense]
  );

  return (
    <div className="flex flex-col gap-4 pb-28">
      {/* Header + live figures */}
      <section className="mp-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/10">
            <Bot className="h-5 w-5 text-violet-400" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">Money assistant</h2>
            <p className="text-[11px] mp-text-3">
              {isOnline
                ? 'Answers come from the records on this device.'
                : 'Offline — still fully usable, everything is stored locally.'}
            </p>
          </div>
          {!isOnline && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-400">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">Balance</span>
            <span className="mp-num truncate text-sm font-bold">{cur}{netWorth.toLocaleString()}</span>
          </div>
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">Saved</span>
            <span className={`mp-num text-sm font-bold ${savingsRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {savingsRate}%
            </span>
          </div>
          <div className="mp-inset p-3">
            <span className="block text-[11px] font-semibold uppercase mp-text-3">Score</span>
            <span className="mp-num text-sm font-bold mp-brand-fg">{financialHealthScore}</span>
          </div>
        </div>
      </section>

      {/* Insight */}
      <section className="mp-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-bold">This month at a glance</h3>
          </div>
          <button
            type="button"
            onClick={() => void requestAiAnalysis()}
            disabled={isAiThinking}
            className="mp-tap flex items-center justify-center rounded-full mp-text-3 disabled:opacity-40"
            aria-label="Refresh analysis"
          >
            <RefreshCw className={`h-4 w-4 ${isAiThinking ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2.5">
          <div className="mp-inset flex items-center gap-2 p-3">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
            <div className="min-w-0">
              <span className="block text-[11px] mp-text-3">In</span>
              <span className="mp-num truncate text-xs font-bold">{cur}{monthlyIncome.toLocaleString()}</span>
            </div>
          </div>
          <div className="mp-inset flex items-center gap-2 p-3">
            <TrendingDown className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="min-w-0">
              <span className="block text-[11px] mp-text-3">Out</span>
              <span className="mp-num truncate text-xs font-bold">{cur}{monthlyExpense.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {!aiInsight || typeof aiInsight === 'string' ? (
          <p className="whitespace-pre-wrap text-xs leading-relaxed mp-text-2">
            {aiInsight || 'Tap refresh for a read on your spending pattern.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-relaxed mp-text-2">{aiInsight.summary}</p>

            {aiInsight.highlights.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {aiInsight.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 text-xs mp-text-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                    <span className="min-w-0">{h}</span>
                  </li>
                ))}
              </ul>
            )}

            {aiInsight.suggestions.length > 0 && (
              <div className="mp-inset p-3">
                <span className="mb-1.5 block text-[11px] font-bold uppercase mp-text-3">
                  Suggested next
                </span>
                <ul className="flex flex-col gap-1.5">
                  {aiInsight.suggestions.map((sg, i) => (
                    <li key={i} className="flex gap-2 text-xs mp-text-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                      <span className="min-w-0">{sg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  aiInsight.spendingHabitRisk === 'low'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : aiInsight.spendingHabitRisk === 'medium'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {aiInsight.spendingHabitRisk} risk
              </span>
              {aiInsight.predictedNextMonthExpense > 0 && (
                <span className="text-[11px] mp-text-3">
                  Next month likely around{' '}
                  <span className="mp-num font-bold mp-text-2">
                    {cur}{Math.round(aiInsight.predictedNextMonthExpense).toLocaleString()}
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Conversation */}
      <section className="mp-card flex flex-col overflow-hidden">
        <div
          ref={listRef}
          className="flex max-h-[52dvh] min-h-[220px] flex-col gap-3 overflow-y-auto p-4"
        >
          {aiChatMessages.map((m) => {
            const mine = m.sender === 'user';
            return (
              <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    mine ? 'bg-zinc-800' : 'bg-violet-500/10'
                  }`}
                >
                  {mine ? (
                    <User className="h-4 w-4 text-zinc-400" />
                  ) : (
                    <Bot className="h-4 w-4 text-violet-400" />
                  )}
                </span>

                <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      mine ? 'rounded-tr-sm text-white' : 'mp-inset rounded-tl-sm'
                    }`}
                    style={mine ? { background: 'var(--brand)' } : undefined}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                  <span className="mt-1 px-1 text-[11px] mp-text-3">{m.timestamp}</span>
                </div>
              </div>
            );
          })}

          {isAiThinking && (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10">
                <Bot className="h-4 w-4 text-violet-400" />
              </span>
              <span className="mp-inset flex gap-1 rounded-2xl rounded-tl-sm px-3.5 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                    style={{ animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Quick prompts */}
        {aiChatMessages.length <= 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-3">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="mp-inset shrink-0 rounded-full px-3.5 py-2 text-[11px] font-semibold mp-text-2"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer — pinned, so it stays visible above the keyboard */}
        <form onSubmit={onSubmit} className="mp-modal-foot flex items-end gap-2 p-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask about your money…"
            className="max-h-28 min-h-[46px] flex-1 resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isAiThinking}
            className="mp-tap flex shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white transition-transform active:scale-95 disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
};
