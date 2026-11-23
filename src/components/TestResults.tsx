import React, {useMemo, useState} from 'react';
import {Check, Copy, Printer, RotateCcw} from 'lucide-react';
import type {TestRecord} from '../types/math';
import {MathText} from './MathText';

interface TestResultsProps {
  record: TestRecord;
  onBackHome: () => void;
}

function getVerdict(percentage: number): string {
  if (percentage >= 90) return 'Aʼlo';
  if (percentage >= 75) return 'Juda yaxshi';
  if (percentage >= 60) return 'Yaxshi';
  if (percentage >= 40) return 'Mashq qilish kerak';
  return 'Jiddiy takrorlash kerak';
}

export const TestResults: React.FC<TestResultsProps> = ({record, onBackHome}) => {
  const [copied, setCopied] = useState(false);
  const [copyNote, setCopyNote] = useState(
    'Natijangizni nusxalab, kerakli joyga joylashtirishingiz (Ctrl + V) yoki chop etishingiz mumkin.',
  );

  const reportText = useMemo(() => {
    const header = [
      'JAVOB VARAQASI',
      `Oʻquvchi: ${record.studentName}`,
      `Mavzu: ${record.topicTitle} (${record.topicSection})`,
      `Natija: ${record.score}/${record.total} (${record.percentage}%)`,
      `Qurilma: ${record.devicePlatform}`,
      `Sana: ${new Date(record.completedAt).toLocaleString('uz-UZ')}`,
      '',
      'Xatolar:',
    ].join('\n');

    const mistakeLines =
      record.mistakes.length > 0
        ? record.mistakes
            .map(
              (m) =>
                `${m.index}. ${m.question} | Oʻquvchi javobi: ${m.userAnswer} | Toʻgʻri javob: ${m.correctAnswer}`,
            )
            .join('\n')
        : 'yoʻq';

    return `${header}\n${mistakeLines}`;
  }, [record]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setCopyNote('Natija nusxalandi. Joylashtirish uchun Ctrl + V bosing.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyNote('Nusxalab boʻlmadi. Pastdagi matnni belgilab, nusxa oling.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {record.studentName} · {record.topicTitle} · {record.devicePlatform}
        </p>

        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <span className="text-5xl sm:text-6xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 tabular-nums">
            {record.score}/{record.total}
          </span>
          <span className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tabular-nums">
            {record.percentage}% · {getVerdict(record.percentage)}
          </span>
        </div>

        <div className="mt-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Javob varaqasi</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{copyNote}</p>

          <div className="mt-3 flex flex-wrap gap-2.5 no-print">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Nusxalandi' : 'Natijani nusxalash'}</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Natijani chop etish</span>
            </button>
            <button
              type="button"
              onClick={onBackHome}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Boshqa mavzuni tanlash</span>
            </button>
          </div>

          <textarea
            readOnly
            rows={6}
            value={reportText}
            aria-label="Javob varaqasi matni"
            className="mt-4 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs font-mono-tabular text-slate-800 dark:text-slate-200 focus:outline-none"
          />
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            Xatolar tahlili ({record.mistakes.length})
          </h3>
          {record.mistakes.length === 0 ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Xato yoʻq. Toʻliq ball!
            </p>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {record.mistakes.map((m) => (
                <div key={m.index} className="py-4 space-y-1.5">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    <span className="font-mono-tabular mr-1.5">{m.index}.</span>
                    <MathText text={m.question} />
                  </p>
                  <p className="text-sm text-rose-700 dark:text-rose-400 font-medium">
                    Sizning javobingiz: <MathText text={m.userAnswer} />
                  </p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                    Toʻgʻri javob: <MathText text={m.correctAnswer} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
