import { AlertTriangle, BarChart3, CheckCircle2, Trash2 } from 'lucide-react';
import type { SavedQuizAttempt } from '../../types/edugenius';
import { computeAnalyticsOverview } from '../../utils/workspaceLogic';

interface PerformanceAnalyticsPanelProps {
  attempts: SavedQuizAttempt[];
  onClearHistory: () => void;
  onStartQuiz: () => void;
}

export function PerformanceAnalyticsPanel({
  attempts,
  onClearHistory,
  onStartQuiz,
}: PerformanceAnalyticsPanelProps) {
  const overview = computeAnalyticsOverview(attempts);

  if (attempts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#4338CA]/10 text-[#4338CA] flex items-center justify-center mx-auto">
          <BarChart3 className="w-6 h-6" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-bold text-[#1E1B4B]">No saved quiz results yet</h2>
        <p className="text-sm text-slate-600">
          Complete a quiz in the Practice Quiz tab to automatically record your real score,
          accuracy percentage, weak topics, and incorrect-answer explanations here.
        </p>
        <button
          type="button"
          onClick={onStartQuiz}
          className="px-5 py-2.5 bg-[#4338CA] hover:bg-[#7C3AED] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Take a Practice Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1E1B4B]">Student Performance Analytics</h2>
          <p className="text-xs text-slate-500">
            Computed exclusively from your {overview.totalQuizzes} completed quiz session
            {overview.totalQuizzes === 1 ? '' : 's'} saved in this browser.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearHistory}
          className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-slate-200 rounded-xl inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Clear Saved History</span>
        </button>
      </div>

      {/* Real KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-slate-500">Quizzes Completed</p>
          <p className="text-2xl font-bold text-[#1E1B4B] tabular-nums">{overview.totalQuizzes}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-slate-500">Questions Answered</p>
          <p className="text-2xl font-bold text-[#4338CA] tabular-nums">
            {overview.totalQuestionsAnswered}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-slate-500">Correct Answers</p>
          <p className="text-2xl font-bold text-[#10B981] tabular-nums">{overview.totalCorrect}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <p className="text-xs text-slate-500">Overall Accuracy</p>
          <p className="text-2xl font-bold text-[#7C3AED] tabular-nums">
            {overview.overallAccuracyPercent}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Weak Topics & Subject Accuracy */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1E1B4B]">Topic Mastery & Weak Areas</h3>
            <p className="text-xs text-slate-500">
              Topics scoring below 70% accuracy are flagged for extra revision.
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {overview.topicSummaries.map((item) => (
              <div key={item.topic} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1E1B4B]">{item.topic}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${
                      item.isWeak ? 'text-red-600' : 'text-[#10B981]'
                    }`}
                  >
                    {item.isWeak ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Weak · {item.accuracyPercent}%</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Strong · {item.accuracyPercent}%</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.isWeak ? 'bg-red-500' : 'bg-[#10B981]'}`}
                    style={{ width: `${item.accuracyPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 tabular-nums">
                  {item.correctAnswers} / {item.totalQuestions} correct across {item.attempts}{' '}
                  attempt{item.attempts === 1 ? '' : 's'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Previous Quiz History + Incorrect Answer Review */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#1E1B4B]">Previous Quiz Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500">
                    <th className="pb-2.5 font-semibold">Topic</th>
                    <th className="pb-2.5 font-semibold">Level</th>
                    <th className="pb-2.5 font-semibold text-right">Score</th>
                    <th className="pb-2.5 font-semibold text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attempts.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-3 font-medium text-[#1E1B4B]">{a.topic}</td>
                      <td className="py-3 pr-3 text-xs text-slate-500">{a.level}</td>
                      <td className="py-3 pr-3 text-right font-mono-tabular text-[#1E1B4B]">
                        {a.correct} / {a.total}
                      </td>
                      <td
                        className={`py-3 text-right font-mono-tabular font-semibold ${
                          a.accuracyPercent < 70 ? 'text-red-600' : 'text-[#10B981]'
                        }`}
                      >
                        {a.accuracyPercent}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#1E1B4B]">
              Incorrect Answers & Explanations Review
            </h3>
            {overview.recentIncorrectItems.length === 0 ? (
              <p className="text-sm text-[#10B981] font-medium">
                Zero missed questions across your saved quiz attempts.
              </p>
            ) : (
              <div className="divide-y divide-slate-200">
                {overview.recentIncorrectItems.map((item, idx) => (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                    <p className="text-xs text-slate-500">{item.topic}</p>
                    <p className="text-sm font-semibold text-[#1E1B4B]">{item.question}</p>
                    <p className="text-xs text-red-600">Your Answer: {item.selectedOption}</p>
                    <p className="text-xs text-[#10B981] font-semibold">
                      Correct Answer: {item.correctOption}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
