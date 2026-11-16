import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMarkdownNotes,
  clampPrecisionValue,
  detectBengaliScript,
  mapPrecisionToThinkingLevel,
  resolveOutputLanguage,
  sanitizeSettings,
  validateTopicInput,
} from './studyFormatter';
import { calculateQuizScore, normalizeQuizQuestions } from './quizLogic';
import type { StudyExplanation } from '../types/edugenius';

test('validateTopicInput rejects empty or overly short input and accepts valid topics', () => {
  assert.ok(validateTopicInput(''));
  assert.ok(validateTopicInput('   '));
  assert.ok(validateTopicInput('a'));
  assert.equal(validateTopicInput('Photosynthesis'), null);
  assert.equal(validateTopicInput('সালোকসংশ্লেষণ'), null);
});

test('detectBengaliScript and resolveOutputLanguage identify Bengali vs English accurately', () => {
  assert.equal(detectBengaliScript('নিউটনের গতিসূত্র'), true);
  assert.equal(detectBengaliScript('Newton laws'), false);
  assert.equal(resolveOutputLanguage('auto', 'বাংলা ব্যাকরণ'), 'bn');
  assert.equal(resolveOutputLanguage('auto', 'Calculus derivatives'), 'en');
  assert.equal(resolveOutputLanguage('bn', 'Physics'), 'bn');
  assert.equal(resolveOutputLanguage('en', 'বাংলা'), 'en');
});

test('clampPrecisionValue enforces 0.2 to 0.7 range and maps thinking level', () => {
  assert.equal(clampPrecisionValue(0.05), 0.2);
  assert.equal(clampPrecisionValue(0.95), 0.7);
  assert.equal(clampPrecisionValue(0.45), 0.45);
  assert.equal(mapPrecisionToThinkingLevel(0.2), 'HIGH');
  assert.equal(mapPrecisionToThinkingLevel(0.45), 'MEDIUM');
  assert.equal(mapPrecisionToThinkingLevel(0.7), 'LOW');
});

test('sanitizeSettings rejects unsupported legacy models and preserves valid config', () => {
  const sanitized = sanitizeSettings({
    model: 'gemini-1.5-pro' as never,
    precision: 0.9,
    defaultLanguage: 'bn',
  });
  assert.equal(sanitized.model, 'gemini-4-hydrogen');
  assert.equal(sanitized.precision, 0.7);
  assert.equal(sanitized.defaultLanguage, 'bn');
});

test('buildMarkdownNotes formats all 3 levels, key points, summary, and flashcards', () => {
  const sample: StudyExplanation = {
    title: 'Ohm Law',
    language: 'en',
    conceptDefinition: 'Voltage is proportional to current at constant temperature.',
    realWorldAnalogy: 'Water pressure pushing flow through a narrow pipe.',
    practicalExamples: ['A 12V battery across a 4 ohm resistor yields 3A current.'],
    keyPoints: ['V = IR', 'Resistance is measured in Ohms'],
    summary: 'Current grows linearly with voltage when resistance stays fixed.',
    flashcards: [{ front: 'What is the SI unit of resistance?', back: 'Ohm (Ω)' }],
  };

  const md = buildMarkdownNotes(sample, {
    subject: 'Science',
    level: 'Secondary (SSC)',
    style: 'Flashcard Points',
  });

  assert.match(md, /# Ohm Law/);
  assert.match(md, /## 1\. Concept Definition/);
  assert.match(md, /## 2\. Real-World Analogy/);
  assert.match(md, /## 3\. Practical Examples/);
  assert.match(md, /## Flashcards/);
  assert.match(md, /Ohm \(Ω\)/);
});

test('normalizeQuizQuestions parses heterogeneous AI JSON formats safely', () => {
  const normalized = normalizeQuizQuestions([
    {
      question: 'What is the powerhouse of the cell?',
      options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'],
      correctAnswer: 'B',
      explanation: 'Mitochondria synthesize ATP through cellular respiration.',
    },
    {
      Question: 'SI unit of force?',
      Options: ['Joule', 'Watt', 'Newton', 'Pascal'],
      'Correct Answer': 'C. Newton',
      'In-depth Explanation': '1 Newton accelerates 1 kg by 1 m/s².',
    },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].correctIndex, 1);
  assert.equal(normalized[1].correctIndex, 2);
});

test('calculateQuizScore computes totals, accuracy percentage, and completion', () => {
  const questions = normalizeQuizQuestions([
    {
      question: 'Q1',
      options: ['A1', 'B1', 'C1', 'D1'],
      correctIndex: 0,
      explanation: 'Exp 1',
    },
    {
      question: 'Q2',
      options: ['A2', 'B2', 'C2', 'D2'],
      correctIndex: 2,
      explanation: 'Exp 2',
    },
    {
      question: 'Q3',
      options: ['A3', 'B3', 'C3', 'D3'],
      correctIndex: 3,
      explanation: 'Exp 3',
    },
    {
      question: 'Q4',
      options: ['A4', 'B4', 'C4', 'D4'],
      correctIndex: 1,
      explanation: 'Exp 4',
    },
  ]);

  const partial = calculateQuizScore(questions, { 1: 0, 2: 1 });
  assert.equal(partial.total, 4);
  assert.equal(partial.answered, 2);
  assert.equal(partial.correct, 1);
  assert.equal(partial.incorrect, 1);
  assert.equal(partial.accuracyPercent, 50);
  assert.equal(partial.isComplete, false);

  const complete = calculateQuizScore(questions, { 1: 0, 2: 2, 3: 3, 4: 0 });
  assert.equal(complete.correct, 3);
  assert.equal(complete.incorrect, 1);
  assert.equal(complete.accuracyPercent, 75);
  assert.equal(complete.scoreLabel, '3 / 4');
  assert.equal(complete.isComplete, true);
});

import { parseInlineSegments, parseTutorBlocks } from './chatFormatter';

test('parseTutorBlocks and parseInlineSegments structure headings, lists, dividers, and bold text', () => {
  const sample = `### Memory Trick\n\nUse **G**ood **H**abits **T**ake **S**trength for $\\Delta G = \\Delta H - T\\Delta S$.\n\n---\n\n- **G**: Gibbs Energy\n- **H**: Enthalpy`;
  const blocks = parseTutorBlocks(sample);

  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'paragraph');
  assert.equal(blocks[2].type, 'divider');
  assert.equal(blocks[3].type, 'list');

  const segments = parseInlineSegments('Use **G**ood for $x^2$.');
  assert.equal(segments.some((s) => s.bold && s.text === 'G'), true);
  assert.equal(segments.some((s) => s.text.includes('$')), false);
});

import {
  buildQuestionPaperMarkdown,
  buildQuizAttemptRecord,
  calculateFlashcardStats,
  calculatePlanProgress,
  computeAnalyticsOverview,
  filterFlashcardsForMode,
  syllabusToPlannerPayload,
  toggleStudyTaskCompletion,
  updateFlashcardStatus,
  validateStudyPlanInput,
} from './workspaceLogic';
import type { QuestionPaper, SmartFlashcard, StudyPlan, SyllabusPlan } from '../types/edugenius';

test('study planner validation, task toggling, and progress calculation work deterministically', () => {
  assert.ok(validateStudyPlanInput({ subjects: '', goals: 'Pass HSC', examDate: '2026-12-01' }));
  assert.ok(validateStudyPlanInput({ subjects: 'Physics', goals: 'A', examDate: '2026-12-01' }));
  assert.ok(validateStudyPlanInput({ subjects: 'Physics', goals: 'Master Optics', examDate: '' }));
  assert.equal(
    validateStudyPlanInput({ subjects: 'Physics', goals: 'Master Optics', examDate: '2026-12-01' }),
    null
  );

  const plan: StudyPlan = {
    id: 'p1',
    title: 'Physics Plan',
    academicLevel: 'Higher Secondary (HSC)',
    subjects: 'Physics',
    examDate: '2026-12-01',
    goals: 'Optics',
    overview: 'Focus daily',
    dailyTasks: [
      { id: 't1', dayLabel: 'Day 1', subject: 'Physics', taskTitle: 'Read Ch 1', durationMinutes: 45, completed: false },
      { id: 't2', dayLabel: 'Day 1', subject: 'Physics', taskTitle: 'Solve 10 problems', durationMinutes: 45, completed: true },
    ],
    weeklySchedule: [],
    createdAt: '2026-11-13T00:00:00Z',
  };

  assert.deepEqual(calculatePlanProgress(plan.dailyTasks), { completed: 1, total: 2, percent: 50 });
  const updated = toggleStudyTaskCompletion(plan, 't1');
  assert.deepEqual(calculatePlanProgress(updated.dailyTasks), { completed: 2, total: 2, percent: 100 });
});

test('smart flashcard revision mode filters cards and computes mastery stats', () => {
  let cards: SmartFlashcard[] = [
    { id: 'c1', topic: 'Optics', front: 'Snell Law?', back: 'n1 sin θ1 = n2 sin θ2', status: 'unreviewed' },
    { id: 'c2', topic: 'Optics', front: 'SI unit of power of lens?', back: 'Diopter', status: 'unreviewed' },
  ];

  cards = updateFlashcardStatus(cards, 'c1', 'known');
  cards = updateFlashcardStatus(cards, 'c2', 'revision');

  assert.equal(filterFlashcardsForMode(cards, false).length, 2);
  const revisionOnly = filterFlashcardsForMode(cards, true);
  assert.equal(revisionOnly.length, 1);
  assert.equal(revisionOnly[0].id, 'c2');

  const stats = calculateFlashcardStats(cards);
  assert.equal(stats.known, 1);
  assert.equal(stats.needRevision, 1);
  assert.equal(stats.masteryPercent, 50);
});

test('real analytics computes weak topics and incorrect explanations from actual quiz attempts', () => {
  const qs = normalizeQuizQuestions([
    { question: 'Q1', options: ['A', 'B', 'C', 'D'], correctIndex: 0, explanation: 'Exp 1' },
    { question: 'Q2', options: ['A', 'B', 'C', 'D'], correctIndex: 1, explanation: 'Exp 2' },
    { question: 'Q3', options: ['A', 'B', 'C', 'D'], correctIndex: 2, explanation: 'Exp 3' },
  ]);

  const attemptWeak = buildQuizAttemptRecord({
    id: 'a1',
    topic: 'Organic Chemistry',
    level: 'Higher Secondary (HSC)',
    questions: qs,
    selectedAnswers: { 1: 0, 2: 0, 3: 0 }, // 1/3 = 33.3%
  });

  const attemptStrong = buildQuizAttemptRecord({
    id: 'a2',
    topic: 'Linear Algebra',
    level: 'Higher Secondary (HSC)',
    questions: qs,
    selectedAnswers: { 1: 0, 2: 1, 3: 2 }, // 3/3 = 100%
  });

  const overview = computeAnalyticsOverview([attemptWeak, attemptStrong]);
  assert.equal(overview.totalQuizzes, 2);
  assert.equal(overview.totalQuestionsAnswered, 6);
  assert.equal(overview.totalCorrect, 4);
  assert.equal(overview.weakTopics.length, 1);
  assert.equal(overview.weakTopics[0].topic, 'Organic Chemistry');
  assert.equal(overview.recentIncorrectItems.length, 2);
});

test('syllabusToPlannerPayload and buildQuestionPaperMarkdown format outputs cleanly', () => {
  const syllabus: SyllabusPlan = {
    id: 's1',
    subjectOrTopic: 'HSC Chemistry 1st Paper',
    academicLevel: 'Higher Secondary (HSC)',
    summary: 'Core chapters',
    chapters: [
      { chapterNumber: 1, title: 'Laboratory Safety', estimatedHours: 3, keyLearningAreas: ['Glassware'], priority: 'Core' },
      { chapterNumber: 2, title: 'Qualitative Chemistry', estimatedHours: 8, keyLearningAreas: ['Quantum numbers'], priority: 'High Priority' },
    ],
    createdAt: '2026-11-13T00:00:00Z',
  };

  const payload = syllabusToPlannerPayload(syllabus);
  assert.equal(payload.subjects, 'HSC Chemistry 1st Paper');
  assert.match(payload.goals, /Ch 2: Qualitative Chemistry/);

  const paper: QuestionPaper = {
    id: 'qp1',
    title: 'Midterm Assessment',
    subject: 'Physics',
    chapter: 'Dynamics',
    academicLevel: 'Secondary (SSC)',
    difficulty: 'Medium',
    totalMarks: 15,
    timeAllowedMinutes: 30,
    mcqs: [
      { number: 1, question: 'Unit of Force?', options: ['Joule', 'Newton', 'Watt', 'Pascal'], correctLetter: 'B', answerText: 'Newton', explanation: 'F=ma' },
    ],
    writtenQuestions: [
      { number: 1, type: 'Short Question', marks: 5, question: 'State Newton second law.', markingRubric: 'Define momentum rate of change.' },
    ],
    createdAt: '2026-11-13T00:00:00Z',
  };

  const md = buildQuestionPaperMarkdown(paper);
  assert.match(md, /Section A: Multiple Choice Questions/);
  assert.match(md, /Section B: Written Questions/);
  assert.match(md, /Separate Answer Key/);
});


