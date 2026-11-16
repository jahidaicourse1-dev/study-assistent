import type { QuizQuestion, QuizResultSummary } from '../types/edugenius';

const LETTER_TO_INDEX: Record<string, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

export function parseCorrectOptionIndex(rawAnswer: unknown, options: string[]): number {
  if (typeof rawAnswer === 'number' && Number.isInteger(rawAnswer) && rawAnswer >= 0 && rawAnswer <= 3) {
    return rawAnswer;
  }
  if (typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    const upper = trimmed.toUpperCase();
    if (upper in LETTER_TO_INDEX) {
      return LETTER_TO_INDEX[upper];
    }
    const letterPrefix = upper.match(/^([A-D])[).:\s]/);
    if (letterPrefix && letterPrefix[1] in LETTER_TO_INDEX) {
      return LETTER_TO_INDEX[letterPrefix[1]];
    }
    const exactMatchIdx = options.findIndex(
      (opt) => opt.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exactMatchIdx >= 0) {
      return exactMatchIdx;
    }
  }
  return 0;
}

export function normalizeQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: QuizQuestion[] = [];

  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;

    const questionText =
      typeof record.question === 'string'
        ? record.question.trim()
        : typeof record.Question === 'string'
          ? record.Question.trim()
          : '';

    const rawOptions = Array.isArray(record.options)
      ? record.options
      : Array.isArray(record.Options)
        ? record.Options
        : [];

    const cleanedOptions = rawOptions
      .map((opt) => (typeof opt === 'string' ? opt.trim() : String(opt ?? '').trim()))
      .filter((opt) => opt.length > 0)
      .slice(0, 4);

    if (!questionText || cleanedOptions.length < 4) {
      return;
    }

    const tupleOptions: [string, string, string, string] = [
      cleanedOptions[0],
      cleanedOptions[1],
      cleanedOptions[2],
      cleanedOptions[3],
    ];

    const rawCorrect =
      record.correctIndex ??
      record.correctAnswer ??
      record['Correct Answer'] ??
      record.answer ??
      0;

    const correctIndex = parseCorrectOptionIndex(rawCorrect, tupleOptions);

    const explanationText =
      typeof record.explanation === 'string'
        ? record.explanation.trim()
        : typeof record.Explanation === 'string'
          ? record.Explanation.trim()
          : typeof record['In-depth Explanation'] === 'string'
            ? String(record['In-depth Explanation']).trim()
            : 'Review the core concept behind this question to confirm why this option is accurate.';

    normalized.push({
      id: idx + 1,
      question: questionText,
      options: tupleOptions,
      correctIndex,
      explanation: explanationText,
    });
  });

  return normalized;
}

export function calculateQuizScore(
  questions: QuizQuestion[],
  selectedAnswers: Record<number, number>
): QuizResultSummary {
  const total = questions.length;
  let answered = 0;
  let correct = 0;
  let incorrect = 0;

  for (const q of questions) {
    const picked = selectedAnswers[q.id];
    if (typeof picked === 'number' && picked >= 0 && picked <= 3) {
      answered += 1;
      if (picked === q.correctIndex) {
        correct += 1;
      } else {
        incorrect += 1;
      }
    }
  }

  const accuracyPercent =
    answered > 0 ? Math.round((correct / answered) * 1000) / 10 : 0;

  return {
    total,
    answered,
    correct,
    incorrect,
    accuracyPercent,
    scoreLabel: `${correct} / ${total}`,
    isComplete: total > 0 && answered === total,
  };
}
