import React, {useState} from 'react';
import {AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock} from 'lucide-react';
import type {ActiveTestSession} from '../types/math';
import {MathText} from './MathText';

interface TestRunnerProps {
  session: ActiveTestSession;
  onSelectAnswer: (questionIdx: number, optionIdx: number) => void;
  onNavigate: (questionIdx: number) => void;
  onFinish: () => void;
  onPauseExit: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const TestRunner: React.FC<TestRunnerProps> = ({
  session,
  onSelectAnswer,
  onNavigate,
  onFinish,
  onPauseExit,
}) => {
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);

  const total = session.questions.length;
  const currentQ = session.questions[session.currentIndex];
  const answeredCount = session.answers.filter((a) => a >= 0).length;
  const unansweredCount = total - answeredCount;
  const progressPct = Math.round((answeredCount / total) * 100);

  const mins = Math.floor(session.remainingSeconds / 60);
  const secs = session.remainingSeconds % 60;
  const timerFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  const isLowTime = session.remainingSeconds <= 300;

  const handleFinishClick = () => {
    if (unansweredCount > 0) {
      setConfirmFinishOpen(true);
    } else {
      onFinish();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {session.studentFirstName} {session.studentLastName} · {session.group} · {session.topicSection}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
            {session.topicTitle}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-mono-tabular font-semibold ${
              isLowTime
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300'
                : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{timerFormatted}</span>
          </div>

          <button
            type="button"
            onClick={onPauseExit}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            Saqlab chiqish
          </button>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-indigo-600 dark:bg-indigo-500 transition-[width] duration-200"
          style={{width: `${progressPct}%`}}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
          <span className="font-mono-tabular font-semibold text-indigo-600 dark:text-indigo-400">
            Savol {session.currentIndex + 1} / {total}
          </span>
          <span className="tabular-nums">
            {total} tadan {answeredCount} tasiga javob berildi
          </span>
        </div>

        <p className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug mb-6">
          <span className="font-mono-tabular mr-1.5">{session.currentIndex + 1}.</span>
          <MathText text={currentQ.q} />
        </p>

        <div className="space-y-3" role="radiogroup" aria-label="Javob variantlari">
          {currentQ.o.map((opt, idx) => {
            const isSelected = session.answers[session.currentIndex] === idx;
            return (
              <button
                key={`${session.currentIndex}-${idx}`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectAnswer(session.currentIndex, idx)}
                className={`w-full min-h-[52px] flex items-center gap-3.5 text-left px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 dark:border-indigo-500 dark:bg-indigo-950/50 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 text-slate-800 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-600'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white dark:bg-indigo-500 dark:border-indigo-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {OPTION_LETTERS[idx]}
                </span>
                <span className="text-base sm:text-lg font-medium leading-snug">
                  <MathText text={opt.t} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={session.currentIndex === 0}
            onClick={() => onNavigate(session.currentIndex - 1)}
            className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Oldingi</span>
          </button>

          {session.currentIndex < total - 1 ? (
            <button
              type="button"
              onClick={() => onNavigate(session.currentIndex + 1)}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <span>Keyingi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishClick}
              className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Testni yakunlash</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Savollar xaritasi</span>
          <button
            type="button"
            onClick={handleFinishClick}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Testni yakunlash
          </button>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {session.questions.map((_, idx) => {
            const answered = session.answers[idx] >= 0;
            const current = idx === session.currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onNavigate(idx)}
                aria-label={`${idx + 1}-savolga oʻtish`}
                className={`min-h-[40px] rounded-xl text-xs font-mono-tabular font-semibold border transition-colors cursor-pointer ${
                  current
                    ? 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-500 dark:bg-indigo-500'
                    : answered
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {confirmFinishOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-finish-title"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 id="confirm-finish-title" className="text-base font-bold text-slate-900 dark:text-white">
                  Testni yakunlaysizmi?
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Hali <strong className="text-slate-900 dark:text-white">{unansweredCount} ta</strong> savolga javob berilmagan. Baribir yakunlashni xohlaysizmi?
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmFinishOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Davom etish
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmFinishOpen(false);
                  onFinish();
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
              >
                Ha, yakunlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
