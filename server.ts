import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  GeminiServiceError,
  generateChapterSyllabus,
  generatePersonalizedStudyPlan,
  generateQuestionPaper,
  generateQuizQuestions,
  generateSmartFlashcards,
  generateStudyExplanation,
  generateTutorChatReply,
  getServerKeyStatus,
  verifyLiveConnection,
} from './server/geminiService';
import { validateTopicInput } from './src/utils/studyFormatter';
import { validateStudyPlanInput } from './src/utils/workspaceLogic';
import type {
  ExplanationStyle,
  LanguagePreference,
  PaperDifficulty,
  StudentLevel,
  Subject,
} from './src/types/edugenius';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const status = getServerKeyStatus();
    res.json({
      ...status,
      checkedAt: new Date().toISOString(),
    });
  });

  app.post('/api/ai/health-check', async (req, res) => {
    try {
      const model = typeof req.body?.model === 'string' ? req.body.model : undefined;
      const result = await verifyLiveConnection(model);
      res.json({
        configured: true,
        liveVerified: result.ok,
        latencyMs: result.latencyMs,
        model: result.model,
        message: result.message,
        checkedAt: new Date().toISOString(),
      });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Health check failed', 500);
      res.status(mapped.status).json({
        configured: getServerKeyStatus().configured,
        liveVerified: false,
        error: mapped.message,
        code: mapped.code,
      });
    }
  });

  app.post('/api/study/explain', async (req, res) => {
    try {
      const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
      const validationError = validateTopicInput(topic);
      if (validationError) {
        res.status(400).json({ error: validationError, code: 'VALIDATION_ERROR' });
        return;
      }

      const subject: Subject = req.body?.subject || 'Science';
      const level: StudentLevel = req.body?.level || 'Higher Secondary (HSC)';
      const style: ExplanationStyle = req.body?.style || 'Detailed Explanation with Examples';
      const language: LanguagePreference = req.body?.language || 'auto';
      const model = typeof req.body?.model === 'string' ? req.body.model : undefined;
      const precision = typeof req.body?.precision === 'number' ? req.body.precision : 0.45;

      const explanation = await generateStudyExplanation({
        topic,
        subject,
        level,
        style,
        language,
        model,
        precision,
      });

      res.json({ explanation });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to explain topic', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/quiz/generate', async (req, res) => {
    try {
      const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
      const validationError = validateTopicInput(topic);
      if (validationError) {
        res.status(400).json({ error: validationError, code: 'VALIDATION_ERROR' });
        return;
      }

      const questionCount = req.body?.questionCount === 10 ? 10 : 5;
      const level: StudentLevel = req.body?.level || 'Higher Secondary (HSC)';
      const language: LanguagePreference = req.body?.language || 'auto';
      const model = typeof req.body?.model === 'string' ? req.body.model : undefined;
      const precision = typeof req.body?.precision === 'number' ? req.body.precision : 0.45;

      const questions = await generateQuizQuestions({
        topic,
        questionCount,
        level,
        language,
        model,
        precision,
      });

      res.json({ questions });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to generate quiz', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/tutor/chat', async (req, res) => {
    try {
      const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
      if (messages.length === 0) {
        res.status(400).json({ error: 'Please enter a message for the AI tutor.', code: 'EMPTY_CHAT' });
        return;
      }

      const language: LanguagePreference = req.body?.language || 'auto';
      const level: StudentLevel = req.body?.level || 'Higher Secondary (HSC)';
      const model = typeof req.body?.model === 'string' ? req.body.model : undefined;
      const precision = typeof req.body?.precision === 'number' ? req.body.precision : 0.45;

      const reply = await generateTutorChatReply({
        messages,
        language,
        level,
        model,
        precision,
      });

      res.json({ reply });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to get tutor reply', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/study/flashcards', async (req, res) => {
    try {
      const topic = typeof req.body?.topic === 'string' ? req.body.topic : '';
      const validationError = validateTopicInput(topic);
      if (validationError) {
        res.status(400).json({ error: validationError, code: 'VALIDATION_ERROR' });
        return;
      }
      const flashcards = await generateSmartFlashcards({
        topic,
        count: typeof req.body?.count === 'number' ? req.body.count : 6,
        level: req.body?.level || 'Higher Secondary (HSC)',
        language: req.body?.language || 'auto',
        model: typeof req.body?.model === 'string' ? req.body.model : undefined,
        precision: typeof req.body?.precision === 'number' ? req.body.precision : 0.45,
      });
      res.json({ flashcards });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to generate flashcards', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/study/plan', async (req, res) => {
    try {
      const subjects = typeof req.body?.subjects === 'string' ? req.body.subjects : '';
      const goals = typeof req.body?.goals === 'string' ? req.body.goals : '';
      const examDate = typeof req.body?.examDate === 'string' ? req.body.examDate : '';
      const validationError = validateStudyPlanInput({ subjects, goals, examDate });
      if (validationError) {
        res.status(400).json({ error: validationError, code: 'VALIDATION_ERROR' });
        return;
      }
      const plan = await generatePersonalizedStudyPlan({
        academicLevel: req.body?.academicLevel || 'Higher Secondary (HSC)',
        subjects,
        goals,
        examDate,
        language: req.body?.language || 'auto',
        model: typeof req.body?.model === 'string' ? req.body.model : undefined,
        precision: typeof req.body?.precision === 'number' ? req.body.precision : 0.45,
      });
      res.json({ plan });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to generate study plan', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/study/syllabus', async (req, res) => {
    try {
      const subjectOrTopic =
        typeof req.body?.subjectOrTopic === 'string' ? req.body.subjectOrTopic : '';
      const validationError = validateTopicInput(subjectOrTopic);
      if (validationError) {
        res.status(400).json({ error: validationError, code: 'VALIDATION_ERROR' });
        return;
      }
      const syllabus = await generateChapterSyllabus({
        subjectOrTopic,
        academicLevel: req.body?.academicLevel || 'Higher Secondary (HSC)',
        language: req.body?.language || 'auto',
        model: typeof req.body?.model === 'string' ? req.body.model : undefined,
        precision: typeof req.body?.precision === 'number' ? req.body.precision : 0.45,
      });
      res.json({ syllabus });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to generate syllabus', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/quiz/paper', async (req, res) => {
    try {
      const subject = typeof req.body?.subject === 'string' ? req.body.subject : '';
      const chapter = typeof req.body?.chapter === 'string' ? req.body.chapter : '';
      const subjectErr = validateTopicInput(subject);
      const chapterErr = validateTopicInput(chapter);
      if (subjectErr || chapterErr) {
        res.status(400).json({
          error: subjectErr || chapterErr || 'Subject and chapter are required.',
          code: 'VALIDATION_ERROR',
        });
        return;
      }
      const paper = await generateQuestionPaper({
        subject,
        chapter,
        academicLevel: req.body?.academicLevel || 'Higher Secondary (HSC)',
        difficulty: (req.body?.difficulty || 'Medium') as PaperDifficulty,
        mcqCount: typeof req.body?.mcqCount === 'number' ? req.body.mcqCount : 5,
        writtenCount: typeof req.body?.writtenCount === 'number' ? req.body.writtenCount : 3,
        language: req.body?.language || 'auto',
        model: typeof req.body?.model === 'string' ? req.body.model : undefined,
        precision: typeof req.body?.precision === 'number' ? req.body.precision : 0.45,
      });
      res.json({ paper });
    } catch (err) {
      const mapped =
        err instanceof GeminiServiceError
          ? err
          : new GeminiServiceError(err instanceof Error ? err.message : 'Failed to generate question paper', 500);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`EduGenius AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start EduGenius AI server:', err);
  process.exit(1);
});
