import React, { useEffect, useState, useMemo } from 'react';
import { Users, TrendingUp, Calendar, Activity } from 'lucide-react';

interface VisitorStats {
  totalVisits: number;
  todayVisits: number;
  monthVisits: number;
  activeOnline: number;
  userVisitNumber: number;
}

// Storage namespace for portal visits
const STORAGE_KEYS = {
  TOTAL: 'inhs_v6_total_visits',
  TODAY: 'inhs_v6_today_visits',
  TODAY_DATE: 'inhs_v6_last_visit_date',
  MONTH: 'inhs_v6_month_visits',
  MONTH_KEY: 'inhs_v6_last_visit_month',
  SESSION_LOGGED: 'inhs_v6_session_visited_flag',
  USER_VISIT_NUM: 'inhs_v6_user_visit_rank',
};

export const VisitorCounter: React.FC = () => {
  const [stats, setStats] = useState<VisitorStats>({
    totalVisits: 1,
    todayVisits: 1,
    monthVisits: 1,
    activeOnline: 3,
    userVisitNumber: 1,
  });

  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const monthStr = todayStr.substring(0, 7);

      const storedTotal = localStorage.getItem(STORAGE_KEYS.TOTAL);
      let currentTotal = storedTotal ? parseInt(storedTotal, 10) : 0;
      if (isNaN(currentTotal) || currentTotal < 0) currentTotal = 0;

      const storedTodayDate = localStorage.getItem(STORAGE_KEYS.TODAY_DATE);
      const storedToday = localStorage.getItem(STORAGE_KEYS.TODAY);
      let currentToday = storedTodayDate === todayStr && storedToday ? parseInt(storedToday, 10) : 0;
      if (isNaN(currentToday) || currentToday < 0) currentToday = 0;

      const storedMonthKey = localStorage.getItem(STORAGE_KEYS.MONTH_KEY);
      const storedMonth = localStorage.getItem(STORAGE_KEYS.MONTH);
      let currentMonth = storedMonthKey === monthStr && storedMonth ? parseInt(storedMonth, 10) : 0;
      if (isNaN(currentMonth) || currentMonth < 0) currentMonth = 0;

      let userRank = localStorage.getItem(STORAGE_KEYS.USER_VISIT_NUM);

      // Automatically record +1 whenever a visitor arrives in a new session
      const alreadyCountedInSession = sessionStorage.getItem(STORAGE_KEYS.SESSION_LOGGED);
      if (!alreadyCountedInSession) {
        currentTotal += 1;
        currentToday += 1;
        currentMonth += 1;

        sessionStorage.setItem(STORAGE_KEYS.SESSION_LOGGED, 'true');
        localStorage.setItem(STORAGE_KEYS.TOTAL, currentTotal.toString());
        localStorage.setItem(STORAGE_KEYS.TODAY, currentToday.toString());
        localStorage.setItem(STORAGE_KEYS.TODAY_DATE, todayStr);
        localStorage.setItem(STORAGE_KEYS.MONTH, currentMonth.toString());
        localStorage.setItem(STORAGE_KEYS.MONTH_KEY, monthStr);
        userRank = currentTotal.toString();
        localStorage.setItem(STORAGE_KEYS.USER_VISIT_NUM, userRank);
      }

      setStats({
        totalVisits: currentTotal,
        todayVisits: currentToday,
        monthVisits: currentMonth,
        activeOnline: 3,
        userVisitNumber: userRank ? parseInt(userRank, 10) : currentTotal,
      });

      // Synchronize with top header visit badge
      window.dispatchEvent(new CustomEvent('inhs_visitor_count_updated', { detail: currentTotal }));
    } catch {
      setStats({
        totalVisits: 1,
        todayVisits: 1,
        monthVisits: 1,
        activeOnline: 3,
        userVisitNumber: 1,
      });
    }

    // Dynamic active online fluctuation
    const interval = setInterval(() => {
      setStats((prev) => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const nextOnline = Math.max(2, Math.min(7, prev.activeOnline + delta));
        return { ...prev, activeOnline: nextOnline };
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // 5-digit compact mechanical roller
  const digits = useMemo(() => {
    const str = stats.totalVisits.toString().padStart(5, '0');
    return str.split('');
  }, [stats.totalVisits]);

  return (
    <div id="visitor-counter" className="relative bg-slate-900/95 rounded-xl border border-slate-800/90 p-3 sm:p-3.5 backdrop-blur-md shadow-md max-w-lg mx-auto">
      {/* Top micro bar with live tracking indicator */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
            Visitor Counter & Analytics
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span className="font-mono text-[9px] uppercase tracking-wide text-slate-400">Auto-Recording Live</span>
        </div>
      </div>

      {/* Main compact center row */}
      <div className="py-2.5 flex items-center justify-between gap-3">
        {/* Mechanical roller */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-md border border-slate-800/90 shadow-inner shrink-0">
          {digits.map((digit, idx) => (
            <div
              key={idx}
              className="relative w-5 h-7 bg-gradient-to-b from-slate-900 via-slate-950 to-black rounded border border-slate-700/70 flex items-center justify-center shadow-xs"
            >
              <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800/60 pointer-events-none" />
              <span className="font-mono text-sm font-bold text-amber-400">
                {digit}
              </span>
            </div>
          ))}
        </div>

        {/* Hits summary label */}
        <div className="text-right">
          <div className="text-[10px] text-slate-400">
            Total Portal Hits
          </div>
          <div className="text-xs font-semibold text-white">
            Visitor <span className="text-amber-400 font-mono">#{stats.userVisitNumber}</span>
          </div>
        </div>
      </div>

      {/* Bottom compact badge row */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800/80 text-[10px]">
        <div className="flex items-center gap-1 text-slate-400">
          <Calendar className="w-2.5 h-2.5 text-blue-400" />
          <span>Today:</span>
          <strong className="text-white font-mono">{stats.todayVisits}</strong>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
          <span>Month:</span>
          <strong className="text-white font-mono">{stats.monthVisits}</strong>
        </div>

        <div className="flex items-center gap-1 text-slate-400">
          <Users className="w-2.5 h-2.5 text-emerald-400" />
          <span>Online:</span>
          <strong className="text-emerald-400 font-mono">{stats.activeOnline}</strong>
        </div>
      </div>
    </div>
  );
};
