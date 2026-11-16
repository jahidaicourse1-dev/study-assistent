import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import type {
  ChatMessage,
  ExplanationStyle,
  LanguagePreference,
  PaperDifficulty,
  QuestionPaper,
  SmartFlashcard,
  StudentLevel,
  StudyExplanation,
  StudyPlan,
  Subject,
  SupportedGeminiModel,
  SyllabusPlan,
} from '../src/types/edugenius';
import {
  clampPrecisionValue,
  mapPrecisionToThinkingLevel,
  resolveOutputLanguage,
} from '../src/utils/studyFormatter';
import { normalizeQuizQuestions } from '../src/utils/quizLogic';

export const EDUGENIUS_SYSTEM_INSTRUCTION = `You are EduGenius AI, an elite educational mentor and adaptive tutor.

Target: Bengali and English-speaking students (SSC, HSC, University, IELTS, Job exams).

Tone: Highly encouraging, clear, structured, and pedagogically sound.

For explanations, break complex topics into three levels:
1. Concept Definition
2. Real-world Analogy
3. Practical Example

For quizzes, always return structured JSON containing:
- Question
- Options [A, B, C, D]
- Correct Answer
- In-depth Explanation

Avoid hallucinations. If unsure, politely clarify. Maintain proper Bengali and English typography.`;

const ALLOWED_MODELS = new Set<SupportedGeminiModel>([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

export function resolveSafeModel(model?: string): SupportedGeminiModel {
  if (model && ALLOWED_MODELS.has(model as SupportedGeminiModel)) {
    return model as SupportedGeminiModel;
  }
  return 'gemini-4-hydrogen';
}

function createClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new GeminiServiceError(
      'Gemini API key is not configured in environment secrets.',
      503,
      'API_KEY_MISSING'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export class GeminiServiceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'GEMINI_ERROR') {
    super(message);
    this.name = 'GeminiServiceError';
    this.status = status;
    this.code = code;
  }
}

function mapGeminiError(err: unknown): GeminiServiceError {
  if (err instanceof GeminiServiceError) return err;

  const rawMsg = err instanceof Error ? err.message : String(err);
  const lower = rawMsg.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('401')) {
    return new GeminiServiceError(
      'AI authentication failed. Please check the GEMINI_API_KEY configured in Settings > Secrets.',
      403,
      'API_KEY_INVALID'
    );
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return new GeminiServiceError(
      'AI rate limit reached. Please wait a moment and try again.',
      429,
      'RATE_LIMITED'
    );
  }
  if (lower.includes('not_found') || lower.includes('404')) {
    return new GeminiServiceError(
      'Requested Gemini model is unavailable. Switched or retry with Gemini 4 Hydrogen.',
      404,
      'MODEL_NOT_FOUND'
    );
  }

  return new GeminiServiceError(
    rawMsg || 'An unexpected error occurred while communicating with Gemini AI.',
    500,
    'UPSTREAM_ERROR'
  );
}

async function withModelFallback<T>(
  preferredModel: SupportedGeminiModel,
  run: (activeModel: SupportedGeminiModel) => Promise<T>
): Promise<T> {
  const alternateModel: SupportedGeminiModel =
    preferredModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';

  const attempts: { model: SupportedGeminiModel; delayMs: number }[] = [
    { model: preferredModel, delayMs: 0 },
    { model: alternateModel, delayMs: 250 },
    { model: alternateModel, delayMs: 1200 },
    { model: preferredModel, delayMs: 2000 },
  ];

  let lastError: GeminiServiceError | null = null;

  for (const attempt of attempts) {
    if (attempt.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
    }
    try {
      return await run(attempt.model);
    } catch (err) {
      const mapped = mapGeminiError(err);
      lastError = mapped;
      if (mapped.status === 400 || mapped.status === 403 || mapped.status === 404) {
        throw mapped;
      }
    }
  }

  throw lastError ?? new GeminiServiceError('Unable to reach Gemini AI right now.', 500);
}

function buildThinkingConfig(model: SupportedGeminiModel, precision: number) {
  if (model !== 'gemini-4-hydrogen') {
    return undefined;
  }
  const levelStr = mapPrecisionToThinkingLevel(precision);
  const levelMap: Record<'LOW' | 'MEDIUM' | 'HIGH', ThinkingLevel> = {
    LOW: ThinkingLevel.LOW,
    MEDIUM: ThinkingLevel.MEDIUM,
    HIGH: ThinkingLevel.HIGH,
  };
  return { thinkingLevel: levelMap[levelStr] };
}

function precisionGuidance(precision: number): string {
  const safe = clampPrecisionValue(precision);
  if (safe <= 0.35) {
    return 'Prioritize strict factual precision, crisp definitions, and exam-ready formulas.';
  }
  if (safe <= 0.55) {
    return 'Balance rigorous academic accuracy with intuitive everyday analogies.';
  }
  return 'Include vivid, memorable real-world analogies and creative study hooks while staying factually accurate.';
}

export function getServerKeyStatus() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const configured = Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY');
  return {
    configured,
    provider: 'Google Gemini (@google/genai)',
    activeModels: ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as SupportedGeminiModel[],
  };
}

export async function verifyLiveConnection(modelInput?: string): Promise<{
  ok: boolean;
  latencyMs: number;
  model: SupportedGeminiModel;
  message: string;
}> {
  const preferred = resolveSafeModel(modelInput);
  const ai = createClient();
  const started = Date.now();
  let usedModel: SupportedGeminiModel = preferred;

  await withModelFallback(preferred, async (activeModel) => {
    usedModel = activeModel;
    await ai.models.generateContent({
      model: activeModel,
      contents: 'Respond with exactly: READY',
      config: {
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
      },
    });
  });

  const latencyMs = Date.now() - started;
  return {
    ok: true,
    latencyMs,
    model: usedModel,
    message: `Verified live connection to ${usedModel} in ${latencyMs}ms.`,
  };
}

export interface ExplainRequestParams {
  topic: string;
  subject: Subject;
  level: StudentLevel;
  style: ExplanationStyle;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}

export async function generateStudyExplanation(
  params: ExplainRequestParams
): Promise<StudyExplanation> {
  const model = resolveSafeModel(params.model);
  const precision = clampPrecisionValue(params.precision ?? 0.45);
  const targetLang = resolveOutputLanguage(params.language, params.topic);
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write the ENTIRE explanation in natural, grammatically accurate Bengali (বাংলা) with proper Unicode Bengali typography. Keep essential technical/scientific terms or formulas clear (with English bracketed terms where helpful for HSC/University students).'
      : 'Write the explanation in clear, crisp academic English.';

  const styleDirective =
    params.style === 'Simple Summary'
      ? 'Keep each section concise, approachable, and easy to scan in 2 minutes.'
      : params.style === 'Flashcard Points'
        ? 'Make key points punchy and also generate 4 to 6 active-recall flashcards (front question + concise back answer).'
        : 'Provide thorough academic depth with 2-3 worked practical examples tailored to exam preparation.';

  const prompt = `Explain the following topic for a student.
Topic / Question: ${params.topic}
Subject: ${params.subject}
Student Level: ${params.level}
Explanation Style: ${params.style}
Language Requirement: ${langDirective}
Pedagogical Guidance: ${styleDirective} ${precisionGuidance(precision)}

Return structured JSON covering:
- title: Clear topic heading
- language: "${targetLang}"
- conceptDefinition: Level 1 Concept Definition
- realWorldAnalogy: Level 2 Real-World Analogy
- practicalExamples: Array of 2-3 Level 3 Practical Examples
- keyPoints: Array of 4-6 important exam/study takeaways
- summary: Concise wrap-up summary
- flashcards: Array of { front, back } items (4-6 items if style is Flashcard Points, or 2-3 quick review cards otherwise)`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig: buildThinkingConfig(activeModel, precision),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            language: { type: Type.STRING },
            conceptDefinition: { type: Type.STRING },
            realWorldAnalogy: { type: Type.STRING },
            practicalExamples: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: { type: Type.STRING },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: [
            'title',
            'language',
            'conceptDefinition',
            'realWorldAnalogy',
            'practicalExamples',
            'keyPoints',
            'summary',
          ],
        },
      },
    })
  );

  const rawText = (response.text ?? '{}').trim();
  const parsed = JSON.parse(rawText) as Partial<StudyExplanation>;

  return {
    title: parsed.title?.trim() || params.topic.trim(),
    language: parsed.language === 'bn' ? 'bn' : targetLang,
    conceptDefinition: parsed.conceptDefinition?.trim() || '',
    realWorldAnalogy: parsed.realWorldAnalogy?.trim() || '',
    practicalExamples: Array.isArray(parsed.practicalExamples)
      ? parsed.practicalExamples.filter((x) => typeof x === 'string' && x.trim().length > 0)
      : [],
    keyPoints: Array.isArray(parsed.keyPoints)
      ? parsed.keyPoints.filter((x) => typeof x === 'string' && x.trim().length > 0)
      : [],
    summary: parsed.summary?.trim() || '',
    flashcards: Array.isArray(parsed.flashcards)
      ? parsed.flashcards.filter((c) => c && c.front && c.back)
      : [],
  };
}

export interface QuizRequestParams {
  topic: string;
  questionCount: 5 | 10;
  level: StudentLevel;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}

export async function generateQuizQuestions(params: QuizRequestParams) {
  const model = resolveSafeModel(params.model);
  const precision = clampPrecisionValue(params.precision ?? 0.45);
  const targetLang = resolveOutputLanguage(params.language, params.topic);
  const count = params.questionCount === 10 ? 10 : 5;
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write all questions, 4 options, and explanations in clear, accurate Bengali (বাংলা) with proper Bengali typography.'
      : 'Write all questions, 4 options, and explanations in clear academic English.';

  const prompt = `Generate exactly ${count} high-quality multiple-choice questions (MCQs) on the topic below.
Topic / Chapter: ${params.topic}
Target Level: ${params.level}
Language: ${langDirective}
Guidance: ${precisionGuidance(precision)}

Rules:
- Each item must have exactly 4 distinct options (representing A, B, C, D without needing "A)" prefixes inside the option string).
- Provide correctIndex as an integer 0, 1, 2, or 3 corresponding to the single unambiguously correct option.
- Provide a clear, concise 2-3 sentence explanation clarifying why the correct answer is right and why the main distractor is wrong.`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen'
            ? { thinkingLevel: precision <= 0.3 ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW }
            : undefined,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              correctIndex: { type: Type.INTEGER },
              explanation: { type: Type.STRING },
            },
            required: ['question', 'options', 'correctIndex', 'explanation'],
          },
        },
      },
    })
  );

  const rawText = (response.text ?? '[]').trim();
  const parsed = JSON.parse(rawText);
  const questions = normalizeQuizQuestions(parsed);

  if (questions.length === 0) {
    throw new GeminiServiceError(
      'Unable to format generated quiz questions. Please try a more specific topic.',
      502,
      'INVALID_QUIZ_FORMAT'
    );
  }

  return questions.slice(0, count);
}

export interface TutorChatParams {
  messages: Pick<ChatMessage, 'role' | 'text'>[];
  language: LanguagePreference;
  level: StudentLevel;
  model?: string;
  precision?: number;
}

export async function generateTutorChatReply(params: TutorChatParams): Promise<string> {
  const model = resolveSafeModel(params.model);
  const precision = clampPrecisionValue(params.precision ?? 0.45);
  const ai = createClient();

  const validMessages = params.messages.filter(
    (m) => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim().length > 0
  );

  if (validMessages.length === 0) {
    throw new GeminiServiceError('Please enter a message to ask your AI tutor.', 400, 'EMPTY_CHAT');
  }

  const lastMessage = validMessages[validMessages.length - 1];
  const priorHistory = validMessages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const targetLang = resolveOutputLanguage(params.language, lastMessage.text);
  const langRule =
    params.language === 'auto'
      ? 'Respond in the same language the student used (Bengali if they wrote in Bengali or asked for Bangla, otherwise English).'
      : targetLang === 'bn'
        ? 'Respond in clear, encouraging Bengali (বাংলা).'
        : 'Respond in clear, encouraging English.';

  const systemInstruction = `${EDUGENIUS_SYSTEM_INSTRUCTION}

Student Level Context: ${params.level}
Language Rule: ${langRule}
Pedagogical Note: ${precisionGuidance(precision)} Remember earlier turns in this conversation and answer follow-up questions contextually. Format sections cleanly with clear headings or bullet points, and write math formulas using readable Unicode symbols (e.g. ΔG = ΔH − TΔS, x², √) rather than raw LaTeX dollar signs.`;

  const response = await withModelFallback(model, async (activeModel) => {
    const chat = ai.chats.create({
      model: activeModel,
      history: priorHistory,
      config: {
        systemInstruction,
        thinkingConfig: buildThinkingConfig(activeModel, precision),
      },
    });
    return chat.sendMessage({
      message: lastMessage.text,
    });
  });

  const reply = response.text?.trim();
  if (!reply) {
    throw new GeminiServiceError('The AI tutor returned an empty response. Please try again.', 502, 'EMPTY_RESPONSE');
  }

  return reply;
}

export async function generateSmartFlashcards(params: {
  topic: string;
  count?: number;
  level: StudentLevel;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}): Promise<SmartFlashcard[]> {
  const model = resolveSafeModel(params.model);
  const precision = clampPrecisionValue(params.precision ?? 0.45);
  const targetLang = resolveOutputLanguage(params.language, params.topic);
  const cardCount = Math.min(20, Math.max(4, params.count ?? 6));
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write all flashcard questions (front) and answers (back) in clear Bengali (বাংলা) with proper Unicode typography.'
      : 'Write all flashcard questions and answers in clear academic English.';

  const prompt = `Create ${cardCount} high-yield active recall flashcards on the topic below.
Topic: ${params.topic}
Student Level: ${params.level}
Language: ${langDirective}
Guidance: ${precisionGuidance(precision)}

Each flashcard must have:
- front: A concise test prompt or concept question.
- back: A crisp, memorable 1-3 sentence answer or formula.`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
            },
            required: ['front', 'back'],
          },
        },
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '[]').trim()) as { front?: string; back?: string }[];
  const now = Date.now();
  return parsed
    .filter((c) => c && typeof c.front === 'string' && typeof c.back === 'string' && c.front.trim() && c.back.trim())
    .slice(0, cardCount)
    .map((c, idx) => ({
      id: `fc-${now}-${idx + 1}`,
      topic: params.topic.trim(),
      front: c.front!.trim(),
      back: c.back!.trim(),
      status: 'unreviewed',
    }));
}

export async function generatePersonalizedStudyPlan(params: {
  academicLevel: StudentLevel;
  subjects: string;
  goals: string;
  examDate: string;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}): Promise<StudyPlan> {
  const model = resolveSafeModel(params.model);
  const precision = clampPrecisionValue(params.precision ?? 0.45);
  const targetLang = resolveOutputLanguage(params.language, `${params.subjects} ${params.goals}`);
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write the plan overview, daily task titles, and weekly schedule objectives in clear Bengali (বাংলা).'
      : 'Write the plan overview, daily tasks, and weekly schedule in crisp English.';

  const prompt = `Build a realistic, personalized daily and weekly study routine for a student.
Academic Level: ${params.academicLevel}
Subjects: ${params.subjects}
Study Goals: ${params.goals}
Target Exam Date: ${params.examDate}
Language: ${langDirective}

Return JSON with:
- title: Short descriptive title for this study plan
- overview: 2-sentence strategic coaching summary leading up to ${params.examDate}
- dailyTasks: 6 actionable daily checklist tasks (dayLabel like "Today · Slot 1" or "Day 1", subject, taskTitle, durationMinutes between 25 and 90)
- weeklySchedule: 7 entries (Monday through Sunday) with day, focusSubject, objective, and hours (number between 1 and 5)`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            overview: { type: Type.STRING },
            dailyTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayLabel: { type: Type.STRING },
                  subject: { type: Type.STRING },
                  taskTitle: { type: Type.STRING },
                  durationMinutes: { type: Type.INTEGER },
                },
                required: ['dayLabel', 'subject', 'taskTitle', 'durationMinutes'],
              },
            },
            weeklySchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING },
                  focusSubject: { type: Type.STRING },
                  objective: { type: Type.STRING },
                  hours: { type: Type.NUMBER },
                },
                required: ['day', 'focusSubject', 'objective', 'hours'],
              },
            },
          },
          required: ['title', 'overview', 'dailyTasks', 'weeklySchedule'],
        },
      },
    })
  );

  const raw = JSON.parse((response.text ?? '{}').trim()) as {
    title?: string;
    overview?: string;
    dailyTasks?: { dayLabel?: string; subject?: string; taskTitle?: string; durationMinutes?: number }[];
    weeklySchedule?: { day?: string; focusSubject?: string; objective?: string; hours?: number }[];
  };

  const now = Date.now();
  return {
    id: `plan-${now}`,
    title: raw.title?.trim() || `${params.subjects} Study Plan`,
    academicLevel: params.academicLevel,
    subjects: params.subjects.trim(),
    examDate: params.examDate,
    goals: params.goals.trim(),
    overview: raw.overview?.trim() || 'Follow your daily slots consistently and review weak areas weekly.',
    dailyTasks: (Array.isArray(raw.dailyTasks) ? raw.dailyTasks : []).map((t, i) => ({
      id: `task-${now}-${i + 1}`,
      dayLabel: t.dayLabel?.trim() || `Session ${i + 1}`,
      subject: t.subject?.trim() || params.subjects.trim(),
      taskTitle: t.taskTitle?.trim() || 'Focused concept practice',
      durationMinutes: Number(t.durationMinutes) > 0 ? Number(t.durationMinutes) : 45,
      completed: false,
    })),
    weeklySchedule: (Array.isArray(raw.weeklySchedule) ? raw.weeklySchedule : []).map((w) => ({
      day: w.day?.trim() || 'Day',
      focusSubject: w.focusSubject?.trim() || params.subjects.trim(),
      objective: w.objective?.trim() || 'Concept review and practice',
      hours: Number(w.hours) > 0 ? Number(w.hours) : 2,
    })),
    createdAt: new Date().toISOString(),
  };
}

export async function generateChapterSyllabus(params: {
  subjectOrTopic: string;
  academicLevel: StudentLevel;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}): Promise<SyllabusPlan> {
  const model = resolveSafeModel(params.model);
  const targetLang = resolveOutputLanguage(params.language, params.subjectOrTopic);
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write chapter titles, summary, and key learning areas in clear Bengali (বাংলা).'
      : 'Write chapter titles, summary, and key learning areas in clear English.';

  const prompt = `Generate a structured chapter-wise study syllabus for the subject or topic below.
Subject / Topic: ${params.subjectOrTopic}
Academic Level: ${params.academicLevel}
Language: ${langDirective}

Return JSON with:
- summary: 2-sentence overview of how to tackle this syllabus
- chapters: 5 to 7 logical chapters in order, each containing:
  - chapterNumber (1, 2, 3...)
  - title
  - estimatedHours (integer 2-12)
  - keyLearningAreas (array of 3-4 essential concepts/formulas/skills)
  - priority ("High Priority" | "Core" | "Practice Focus")`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  chapterNumber: { type: Type.INTEGER },
                  title: { type: Type.STRING },
                  estimatedHours: { type: Type.INTEGER },
                  keyLearningAreas: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  priority: { type: Type.STRING },
                },
                required: ['chapterNumber', 'title', 'estimatedHours', 'keyLearningAreas', 'priority'],
              },
            },
          },
          required: ['summary', 'chapters'],
        },
      },
    })
  );

  const raw = JSON.parse((response.text ?? '{}').trim()) as {
    summary?: string;
    chapters?: {
      chapterNumber?: number;
      title?: string;
      estimatedHours?: number;
      keyLearningAreas?: string[];
      priority?: string;
    }[];
  };

  return {
    id: `syl-${Date.now()}`,
    subjectOrTopic: params.subjectOrTopic.trim(),
    academicLevel: params.academicLevel,
    summary: raw.summary?.trim() || '',
    chapters: (Array.isArray(raw.chapters) ? raw.chapters : []).map((ch, idx) => {
      const p = ch.priority;
      const safePriority =
        p === 'High Priority' || p === 'Core' || p === 'Practice Focus' ? p : 'Core';
      return {
        chapterNumber: ch.chapterNumber ?? idx + 1,
        title: ch.title?.trim() || `Chapter ${idx + 1}`,
        estimatedHours: Number(ch.estimatedHours) > 0 ? Number(ch.estimatedHours) : 4,
        keyLearningAreas: Array.isArray(ch.keyLearningAreas)
          ? ch.keyLearningAreas.filter((k) => typeof k === 'string' && k.trim().length > 0)
          : [],
        priority: safePriority,
      };
    }),
    createdAt: new Date().toISOString(),
  };
}

export async function generateQuestionPaper(params: {
  subject: string;
  chapter: string;
  academicLevel: StudentLevel;
  difficulty: PaperDifficulty;
  mcqCount?: number;
  writtenCount?: number;
  language: LanguagePreference;
  model?: string;
  precision?: number;
}): Promise<QuestionPaper> {
  const model = resolveSafeModel(params.model);
  const targetLang = resolveOutputLanguage(params.language, `${params.subject} ${params.chapter}`);
  const mcqCount = Math.min(20, Math.max(3, params.mcqCount ?? 5));
  const writtenCount = Math.min(10, Math.max(2, params.writtenCount ?? 3));
  const ai = createClient();

  const langDirective =
    targetLang === 'bn'
      ? 'Write the entire question paper, options, and answer key in clear Bengali (বাংলা).'
      : 'Write the question paper, options, and answer key in crisp academic English.';

  const prompt = `Act as an experienced exam board setter. Create a structured question paper with a separate answer key.
Subject: ${params.subject}
Chapter / Topic: ${params.chapter}
Academic Level: ${params.academicLevel}
Difficulty: ${params.difficulty}
Language: ${langDirective}

Generate:
- title: Formal assessment title
- timeAllowedMinutes: Realistic exam duration (e.g., 35 or 45)
- mcqs: Exactly ${mcqCount} multiple-choice questions (1 mark each), each with:
  - number (1..${mcqCount})
  - question
  - options (array of exactly 4 strings)
  - correctLetter ("A" | "B" | "C" | "D")
  - answerText (exact text of the correct option)
  - explanation (brief 1-2 sentence key note)
- writtenQuestions: Exactly ${writtenCount} written questions mixing "Short Question" (2-4 marks) and "Creative / Broad Question" (5-8 marks), each with:
  - number (1..${writtenCount})
  - type ("Short Question" | "Creative / Broad Question")
  - marks (integer)
  - question
  - markingRubric (key answer points for grading)`;

  const response = await withModelFallback(model, (activeModel) =>
    ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction: EDUGENIUS_SYSTEM_INSTRUCTION,
        thinkingConfig:
          activeModel === 'gemini-4-hydrogen' ? { thinkingLevel: ThinkingLevel.LOW } : undefined,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            timeAllowedMinutes: { type: Type.INTEGER },
            mcqs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctLetter: { type: Type.STRING },
                  answerText: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['number', 'question', 'options', 'correctLetter', 'answerText', 'explanation'],
              },
            },
            writtenQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  number: { type: Type.INTEGER },
                  type: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  question: { type: Type.STRING },
                  markingRubric: { type: Type.STRING },
                },
                required: ['number', 'type', 'marks', 'question', 'markingRubric'],
              },
            },
          },
          required: ['title', 'timeAllowedMinutes', 'mcqs', 'writtenQuestions'],
        },
      },
    })
  );

  const raw = JSON.parse((response.text ?? '{}').trim()) as {
    title?: string;
    timeAllowedMinutes?: number;
    mcqs?: {
      number?: number;
      question?: string;
      options?: string[];
      correctLetter?: string;
      answerText?: string;
      explanation?: string;
    }[];
    writtenQuestions?: {
      number?: number;
      type?: string;
      marks?: number;
      question?: string;
      markingRubric?: string;
    }[];
  };

  const stripLetterPrefix = (val: string) => val.replace(/^[A-Da-d]\s*[.:)]\s*/, '').trim();

  const mcqs = (Array.isArray(raw.mcqs) ? raw.mcqs : []).slice(0, mcqCount).map((m, idx) => {
    const rawOpts = Array.isArray(m.options) ? m.options.slice(0, 4) : [];
    const opts = rawOpts.map((o) => stripLetterPrefix(String(o ?? '')));
    while (opts.length < 4) opts.push(`Option ${opts.length + 1}`);
    const letter = m.correctLetter?.trim().toUpperCase();
    const safeLetter =
      letter === 'A' || letter === 'B' || letter === 'C' || letter === 'D' ? letter : 'A';
    return {
      number: idx + 1,
      question: m.question?.trim() || `Question ${idx + 1}`,
      options: [opts[0], opts[1], opts[2], opts[3]] as [string, string, string, string],
      correctLetter: safeLetter as 'A' | 'B' | 'C' | 'D',
      answerText: stripLetterPrefix(m.answerText?.trim() || opts[0]),
      explanation: m.explanation?.trim() || '',
    };
  });

  const writtenQuestions = (Array.isArray(raw.writtenQuestions) ? raw.writtenQuestions : [])
    .slice(0, writtenCount)
    .map((w, idx) => ({
      number: idx + 1,
      type: (w.type === 'Creative / Broad Question'
        ? 'Creative / Broad Question'
        : 'Short Question') as 'Short Question' | 'Creative / Broad Question',
      marks: Number(w.marks) > 0 ? Number(w.marks) : 4,
      question: w.question?.trim() || `Written Question ${idx + 1}`,
      markingRubric: w.markingRubric?.trim() || '',
    }));

  const totalMarks =
    mcqs.length + writtenQuestions.reduce((sum, item) => sum + item.marks, 0);

  return {
    id: `paper-${Date.now()}`,
    title: raw.title?.trim() || `${params.subject}: ${params.chapter} Assessment`,
    subject: params.subject.trim(),
    chapter: params.chapter.trim(),
    academicLevel: params.academicLevel,
    difficulty: params.difficulty,
    totalMarks,
    timeAllowedMinutes: Number(raw.timeAllowedMinutes) > 0 ? Number(raw.timeAllowedMinutes) : 40,
    mcqs,
    writtenQuestions,
    createdAt: new Date().toISOString(),
  };
}

