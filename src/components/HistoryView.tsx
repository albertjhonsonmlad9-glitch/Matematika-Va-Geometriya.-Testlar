import React, {useState} from 'react';
import {ChevronRight, FileText} from 'lucide-react';
import type {TestRecord} from '../types/math';
import {TestResults} from './TestResults';

interface HistoryViewProps {
  history: TestRecord[];
  onGoTopics: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({history, onGoTopics}) => {
  const [selectedRecord, setSelectedRecord] = useState<TestRecord | null>(null);

  if (selectedRecord) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setSelectedRecord(null)}
          className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          ← Natijalar roʻyxatiga qaytish
        </button>
        <TestResults record={selectedRecord} onBackHome={onGoTopics} />
      </div>
    );
  }

  const averagePct =
    history.length > 0
      ? Math.round(history.reduce((sum, r) => sum + r.percentage, 0) / history.length)
      : 0;
  const bestPct = history.length > 0 ? Math.max(...history.map((r) => r.percentage)) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Yechilgan testlar</span>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
            {history.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Oʻrtacha natija</span>
          <p className="mt-1 text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {averagePct}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Eng yuqori koʻrsatkich</span>
          <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {bestPct}%
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Test natijalari tarixi</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {history.length} ta yozuv
          </span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Hali yakunlangan testlar yoʻq
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Mavzulardan birini tanlab testni yakunlaganingizda, natija bu yerda saqlanadi va barcha qurilmalaringizda koʻrinadi.
            </p>
            <button
              type="button"
              onClick={onGoTopics}
              className="mt-2 min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Mavzularga oʻtish
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {history.map((rec) => (
              <button
                key={rec.id}
                type="button"
                onClick={() => setSelectedRecord(rec)}
                className="w-full min-h-[64px] px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                    {rec.topicTitle}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    {rec.studentName} · {rec.devicePlatform} · {new Date(rec.completedAt).toLocaleString('uz-UZ')}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      {rec.score}/{rec.total}
                    </p>
                    <p
                      className={`text-xs font-semibold tabular-nums ${
                        rec.percentage >= 75
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : rec.percentage >= 50
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {rec.percentage}%
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
