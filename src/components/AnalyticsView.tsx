import React, { useState, useMemo } from 'react';
import { useFinancials } from '../state/FinancialContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  Activity,
  HandCoins,
  Landmark,
  ReceiptText,
  Scale
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const {
    transactions,
    userProfile,
    totalIncome,
    totalExpense,
    netWorth,
    accounts,
    totalAccountsBalance,
    totalLent,
    totalBorrowed,
    borrowLendNet,
    fixedObligations,
    totalFixedObligationsAmount,
    paidFixedObligationsAmount,
    monthlyIncome,
    monthlyExpense,
  } = useFinancials();

  const cur = userProfile.currencySymbol;
  const money = (n: number) => `${cur}${Math.round(n).toLocaleString()}`;

  const unpaidFixedAmount = totalFixedObligationsAmount - paidFixedObligationsAmount;
  const unpaidFixedCount = fixedObligations.filter((o) => !o.isPaid).length;
  const currentBalance = accounts.length > 0 ? totalAccountsBalance : netWorth;

  /**
   * "If I collected every rupee owed to me, paid off everything I owe, and
   * cleared this month's remaining bills right now — what would I actually
   * have left?" The single number the user asked for.
   */
  const bottomLine = currentBalance + totalLent - totalBorrowed - unpaidFixedAmount;

  const isDark = userProfile.themeMode === 'dark';

  // Timeframe filter state
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('all');

  // Filtered transactions based on timeframe
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const txDate = new Date(t.date);
      if (timeframe === 'daily') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeframe === 'weekly') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else if (timeframe === 'monthly') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeframe === 'yearly') {
        return txDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, timeframe]);

  // Derived filtered metrics
  const periodIncome = filteredTransactions
    .filter((t) => !t.isPending && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const periodExpense = filteredTransactions
    .filter((t) => !t.isPending && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Category spending breakdown for selected timeframe
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });

    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  const maxExpenseCategoryAmount = categorySpending[0]?.amount || 1;

  // Payment method breakdown
  const paymentMethodBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      map[t.paymentMethod] = (map[t.paymentMethod] || 0) + 1;
    });
    return Object.entries(map);
  }, [filteredTransactions]);

  // Export CSV Helper
  const handleExportCSV = () => {
    const headers = ['ID,Title,Amount,Type,Category,MainCategory,Date,PaymentMethod,Notes'];
    const rows = filteredTransactions.map((t) =>
      `"${t.id}","${t.title.replace(/"/g, '""')}",${t.amount},"${t.type}","${t.category}","${t.mainCategory}","${t.date}","${t.paymentMethod}","${(t.notes || '').replace(/"/g, '""')}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MyPaisa_Financial_Report_${timeframe}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel Helper
  const handleExportExcel = () => {
    const headers = ['ID\tTitle\tAmount\tType\tCategory\tMainCategory\tDate\tPaymentMethod\tNotes'];
    const rows = filteredTransactions.map((t) =>
      `${t.id}\t${t.title}\t${t.amount}\t${t.type}\t${t.category}\t${t.mainCategory}\t${t.date}\t${t.paymentMethod}\t${t.notes || ''}`
    );
    const tsvContent = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent([headers, ...rows].join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', tsvContent);
    link.setAttribute('download', `MyPaisa_Report_${timeframe}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Printable PDF Summary Helper
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>My Paisa Financial Report - Developed by SIHFZ</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #1e293b; }
            h1 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 5px; }
            .subtitle { font-size: 12px; color: #64748b; margin-bottom: 25px; }
            .summary-box { display: flex; gap: 20px; margin-bottom: 25px; }
            .card { flex: 1; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; }
            .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
            .card-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; }
            .type-income { color: #16a34a; font-weight: bold; }
            .type-expense { color: #dc2626; font-weight: bold; }
            .footer { margin-top: 30px; font-size: 11px; text-align: center; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>My Paisa Financial Report</h1>
          <p className="subtitle">Developed by SIHFZ • Generated on ${new Date().toLocaleString()} • Timeframe: ${timeframe.toUpperCase()}</p>

          <div className="summary-box">
            <div className="card">
              <div className="card-title">Income (${timeframe})</div>
              <div className="card-value" style="color:#16a34a">${userProfile.currencySymbol}${periodIncome.toLocaleString()}</div>
            </div>
            <div className="card">
              <div className="card-title">Expense (${timeframe})</div>
              <div className="card-value" style="color:#dc2626">${userProfile.currencySymbol}${periodExpense.toLocaleString()}</div>
            </div>
            <div className="card">
              <div className="card-title">Net Surplus</div>
              <div className="card-value">${userProfile.currencySymbol}${(periodIncome - periodExpense).toLocaleString()}</div>
            </div>
          </div>

          <h3>Transaction Details (${filteredTransactions.length} Items)</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Type</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Payment Method</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions
                .map(
                  (t) => `
                <tr>
                  <td>${t.date.split('T')[0]}</td>
                  <td>${t.title}</td>
                  <td class="type-${t.type}">${t.type.toUpperCase()}</td>
                  <td>${t.category}</td>
                  <td>${userProfile.currencySymbol}${t.amount.toLocaleString()}</td>
                  <td>${t.paymentMethod}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div className="footer">My Paisa • Your Personal AI Financial Assistant • SIHFZ</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 pb-16 md:pb-6">
      {/* Header & Filter Controls */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-[2rem] border shadow-xl transition-colors ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <h2 className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Financial Analytics & Reports
            </h2>
          </div>
          <p className="text-xs text-zinc-500 font-medium">
            Visual breakdown of spending habits, income sources, and report export engine.
          </p>
        </div>

        {/* Timeframe selector & Export buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-0.5 overflow-x-auto rounded-2xl p-1 border ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                  timeframe === tf
                    ? 'bg-indigo-500 text-white shadow-md'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Export Excel"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Print PDF Summary Report"
            >
              <FileText className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ===================== YOUR FINANCIAL SITUATION ===================== */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <Activity className="h-5 w-5 text-violet-500" />
          <h3 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            Your Financial Situation
          </h3>
        </div>
        <p className="text-xs text-zinc-500 font-medium mb-5">
          Everything you own, owe, and are owed — combined into one picture.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="mp-inset p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mp-text-3">
              <Wallet className="h-3.5 w-3.5" /> Current balance
            </span>
            <p className="mp-num mt-1.5 truncate text-xl font-extrabold">{money(currentBalance)}</p>
            {accounts.length > 0 && <p className="text-[10px] mp-text-3 mt-0.5">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</p>}
          </div>

          <div className="mp-inset p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mp-text-3">
              <HandCoins className="h-3.5 w-3.5" /> You'll receive
            </span>
            <p className="mp-num mt-1.5 truncate text-xl font-extrabold text-emerald-500">{money(totalLent)}</p>
            <p className="text-[10px] mp-text-3 mt-0.5">Money lent out, unpaid</p>
          </div>

          <div className="mp-inset p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mp-text-3">
              <Landmark className="h-3.5 w-3.5" /> You owe
            </span>
            <p className="mp-num mt-1.5 truncate text-xl font-extrabold text-rose-500">{money(totalBorrowed)}</p>
            <p className="text-[10px] mp-text-3 mt-0.5">Borrowed, still unpaid</p>
          </div>

          <div className="mp-inset p-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide mp-text-3">
              <ReceiptText className="h-3.5 w-3.5" /> Fixed bills left
            </span>
            <p className="mp-num mt-1.5 truncate text-xl font-extrabold text-amber-500">{money(unpaidFixedAmount)}</p>
            <p className="text-[10px] mp-text-3 mt-0.5">
              {unpaidFixedCount} of {fixedObligations.length} unpaid this month
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.06))', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-violet-400">Bottom line</span>
          </div>
          <p className={`mp-num text-2xl font-extrabold ${bottomLine >= 0 ? (isDark ? 'text-white' : 'text-zinc-900') : 'text-rose-500'}`}>
            {money(bottomLine)}
          </p>
          <p className="text-[11px] mp-text-3 mt-1.5">
            What you'd have left if you collected every rupee owed to you, paid off everything you owe,
            and cleared this month's remaining bills — right now.
          </p>
          <p className="text-[10px] mp-text-3 mt-2">
            {money(currentBalance)} balance + {money(totalLent)} to receive − {money(totalBorrowed)} to pay − {money(unpaidFixedAmount)} unpaid bills
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <div className="mp-inset p-3 text-center">
            <span className="block text-[10px] font-semibold uppercase mp-text-3">This month in</span>
            <span className="mp-num text-sm font-bold text-emerald-500">{money(monthlyIncome)}</span>
          </div>
          <div className="mp-inset p-3 text-center">
            <span className="block text-[10px] font-semibold uppercase mp-text-3">This month out</span>
            <span className="mp-num text-sm font-bold text-rose-500">{money(monthlyExpense)}</span>
          </div>
          <div className="mp-inset p-3 text-center">
            <span className="block text-[10px] font-semibold uppercase mp-text-3">Net debt position</span>
            <span className={`mp-num text-sm font-bold ${borrowLendNet >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {money(borrowLendNet)}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className={`rounded-[2rem] p-7 border shadow-xl ${
          isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-wider">
              <ArrowUpRight className="h-4 w-4" /> Earned Income ({timeframe})
            </div>
          </div>
          <span className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {userProfile.currencySymbol}
            {periodIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={`rounded-[2rem] p-7 border shadow-xl ${
          isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-500 uppercase tracking-wider">
              <ArrowDownRight className="h-4 w-4" /> Outflow Expenses ({timeframe})
            </div>
          </div>
          <span className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {userProfile.currencySymbol}
            {periodExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className={`rounded-[2rem] p-7 border shadow-xl ${
          isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
              <Wallet className="h-4 w-4" /> Net Surplus ({timeframe})
            </div>
          </div>
          <span className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {userProfile.currencySymbol}
            {(periodIncome - periodExpense).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Category Breakdown Bar Chart */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Expense Distribution ({timeframe})
            </h3>
            <p className="text-xs text-zinc-500">Highest spending categories ranked by total volume</p>
          </div>
          <PieChart className="h-5 w-5 text-indigo-500" />
        </div>

        <div className="flex flex-col gap-4">
          {categorySpending.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No expense entries recorded for this timeframe.
            </div>
          ) : (
            categorySpending.map(({ category, amount }) => {
              const percentage = Math.round((amount / maxExpenseCategoryAmount) * 100);
              const totalPercent = periodExpense > 0 ? Math.round((amount / periodExpense) * 100) : 0;

              return (
                <div key={category} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className={isDark ? 'text-zinc-200' : 'text-zinc-700'}>{category}</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      {userProfile.currencySymbol}
                      {amount.toLocaleString()}{' '}
                      <span className="text-zinc-500 font-mono">({totalPercent}%)</span>
                    </span>
                  </div>

                  <div className={`w-full h-2.5 rounded-full overflow-hidden border ${
                    isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
                  }`}>
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className={`rounded-[2rem] border p-7 shadow-xl ${
        isDark ? 'bg-[#131316] border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
      }`}>
        <h3 className={`text-base font-bold tracking-tight mb-4 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
          Payment Channels Used ({timeframe})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {paymentMethodBreakdown.map(([method, count]) => (
            <div key={method} className={`p-4 rounded-2xl border text-center ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }`}>
              <span className="text-2xl font-mono font-bold text-indigo-500 block">{count}</span>
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{method}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
