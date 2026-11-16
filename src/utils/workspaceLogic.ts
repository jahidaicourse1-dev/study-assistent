import type {
  AnalyticsOverview,
  FlashcardStatus,
  QuestionPaper,
  QuizQuestion,
  SavedIncorrectItem,
  SavedQuizAttempt,
  SmartFlashcard,
  StudentLevel,
  StudyPlan,
  StudyTask,
  SyllabusPlan,
  TopicPerformanceSummary,
} from '../types/edugenius';

export function validateStudyPlanInput(params: {
  subjects: string;
  goals: string;
  examDate: string;
}): string | null {
  if (!params.subjects.trim() || params.subjects.trim().length < 2) {
    return 'Please enter at least one subject (e.g. Physics, Math, English).';
  }
  if (!params.goals.trim() || params.goals.trim().length < 4) {
    return 'Please describe your study goal (e.g. Complete HSC Physics Chapters 1-4).';
  }
  if (!params.examDate.trim()) {
    return 'Please choose a target exam or milestone date.';
  }
  return null;
}

export function toggleStudyTaskCompletion(plan: StudyPlan, taskId: string): StudyPlan {
  return {
    ...plan,
    dailyTasks: plan.dailyTasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ),
  };
}

export function calculatePlanProgress(tasks: StudyTask[]): {
  completed: number;
  total: number;
  percent: number;
} {
  const total = tasks.length;
  if (total === 0) return { completed: 0, total: 0, percent: 0 };
  const completed = tasks.filter((t) => t.completed).length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function updateFlashcardStatus(
  cards: SmartFlashcard[],
  cardId: string,
  status: FlashcardStatus
): SmartFlashcard[] {
  return cards.map((card) => (card.id === cardId ? { ...card, status } : card));
}

export function filterFlashcardsForMode(
  cards: SmartFlashcard[],
  revisionOnly: boolean
): SmartFlashcard[] {
  if (!revisionOnly) return cards;
  return cards.filter((c) => c.status === 'revision');
}

export function calculateFlashcardStats(cards: SmartFlashcard[]): {
  total: number;
  known: number;
  needRevision: number;
  unreviewed: number;
  masteryPercent: number;
} {
  const total = cards.length;
  const known = cards.filter((c) => c.status === 'known').length;
  const needRevision = cards.filter((c) => c.status === 'revision').length;
  const unreviewed = total - known - needRevision;
  const masteryPercent = total > 0 ? Math.round((known / total) * 100) : 0;
  return { total, known, needRevision, unreviewed, masteryPercent };
}

export function buildQuizAttemptRecord(params: {
  id: string;
  topic: string;
  level: StudentLevel;
  questions: QuizQuestion[];
  selectedAnswers: Record<number, number>;
}): SavedQuizAttempt {
  let correct = 0;
  let incorrect = 0;
  const incorrectItems: SavedIncorrectItem[] = [];

  for (const q of params.questions) {
    const picked = params.selectedAnswers[q.id];
    if (typeof picked !== 'number' || picked < 0 || picked > 3) continue;
    if (picked === q.correctIndex) {
      correct += 1;
    } else {
      incorrect += 1;
      incorrectItems.push({
        question: q.question,
        selectedOption: q.options[picked] ?? 'Unknown',
        correctOption: q.options[q.correctIndex] ?? 'Unknown',
        explanation: q.explanation,
      });
    }
  }

  const total = params.questions.length;
  const accuracyPercent = total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  return {
    id: params.id,
    topic: params.topic.trim(),
    level: params.level,
    total,
    correct,
    incorrect,
    accuracyPercent,
    incorrectItems,
    completedAt: new Date().toISOString(),
  };
}

export function computeAnalyticsOverview(attempts: SavedQuizAttempt[]): AnalyticsOverview {
  if (attempts.length === 0) {
    return {
      totalQuizzes: 0,
      totalQuestionsAnswered: 0,
      totalCorrect: 0,
      overallAccuracyPercent: 0,
      weakTopics: [],
      topicSummaries: [],
      recentIncorrectItems: [],
    };
  }

  let totalQuestionsAnswered = 0;
  let totalCorrect = 0;
  const byTopic = new Map<
    string,
    { displayTopic: string; attempts: number; totalQuestions: number; correctAnswers: number }
  >();

  const recentIncorrectItems: (SavedIncorrectItem & {
    topic: string;
    completedAt: string;
  })[] = [];

  for (const attempt of attempts) {
    totalQuestionsAnswered += attempt.total;
    totalCorrect += attempt.correct;

    const key = attempt.topic.trim().toLowerCase();
    const existing = byTopic.get(key);
    if (existing) {
      existing.attempts += 1;
      existing.totalQuestions += attempt.total;
      existing.correctAnswers += attempt.correct;
    } else {
      byTopic.set(key, {
        displayTopic: attempt.topic.trim(),
        attempts: 1,
        totalQuestions: attempt.total,
        correctAnswers: attempt.correct,
      });
    }

    for (const item of attempt.incorrectItems) {
      recentIncorrectItems.push({
        ...item,
        topic: attempt.topic,
        completedAt: attempt.completedAt,
      });
    }
  }

  const topicSummaries: TopicPerformanceSummary[] = Array.from(byTopic.values())
    .map((entry) => {
      const accuracyPercent =
        entry.totalQuestions > 0
          ? Math.round((entry.correctAnswers / entry.totalQuestions) * 1000) / 10
          : 0;
      return {
        topic: entry.displayTopic,
        attempts: entry.attempts,
        totalQuestions: entry.totalQuestions,
        correctAnswers: entry.correctAnswers,
        accuracyPercent,
        isWeak: accuracyPercent < 70,
      };
    })
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);

  const weakTopics = topicSummaries.filter((t) => t.isWeak);

  const overallAccuracyPercent =
    totalQuestionsAnswered > 0
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 1000) / 10
      : 0;

  return {
    totalQuizzes: attempts.length,
    totalQuestionsAnswered,
    totalCorrect,
    overallAccuracyPercent,
    weakTopics,
    topicSummaries,
    recentIncorrectItems: recentIncorrectItems.slice(0, 15),
  };
}

export function syllabusToPlannerPayload(syllabus: SyllabusPlan): {
  subjects: string;
  goals: string;
  academicLevel: StudentLevel;
} {
  const highPriority = syllabus.chapters
    .filter((ch) => ch.priority === 'High Priority' || ch.priority === 'Core')
    .slice(0, 4)
    .map((ch) => `Ch ${ch.chapterNumber}: ${ch.title}`);

  const goalsText =
    highPriority.length > 0
      ? `Master ${syllabus.subjectOrTopic} covering ${highPriority.join(', ')}.`
      : `Complete structured syllabus for ${syllabus.subjectOrTopic}.`;

  return {
    subjects: syllabus.subjectOrTopic,
    goals: goalsText,
    academicLevel: syllabus.academicLevel,
  };
}

export function buildQuestionPaperMarkdown(paper: QuestionPaper): string {
  const lines: string[] = [
    `# ${paper.title}`,
    '',
    `- **Subject:** ${paper.subject}`,
    `- **Chapter:** ${paper.chapter}`,
    `- **Academic Level:** ${paper.academicLevel}`,
    `- **Difficulty:** ${paper.difficulty}`,
    `- **Total Marks:** ${paper.totalMarks} | **Time Allowed:** ${paper.timeAllowedMinutes} minutes`,
    '',
    '---',
    '',
    '## Section A: Multiple Choice Questions',
    '',
  ];

  paper.mcqs.forEach((q) => {
    lines.push(`${q.number}. ${q.question}`);
    const letters = ['A', 'B', 'C', 'D'];
    q.options.forEach((opt, idx) => {
      lines.push(`   ${letters[idx]}. ${opt}`);
    });
    lines.push('');
  });

  lines.push('## Section B: Written Questions', '');
  paper.writtenQuestions.forEach((w) => {
    lines.push(`${w.number}. [${w.type} · ${w.marks} Marks] ${w.question}`, '');
  });

  lines.push('---', '', '## Separate Answer Key', '', '### Section A Answers');
  paper.mcqs.forEach((q) => {
    lines.push(
      `- **Q${q.number}:** ${q.correctLetter} (${q.answerText}) — ${q.explanation}`
    );
  });

  lines.push('', '### Section B Marking Guidelines');
  paper.writtenQuestions.forEach((w) => {
    lines.push(`- **Q${w.number} (${w.marks} Marks):** ${w.markingRubric}`);
  });

  return lines.join('\n');
}
