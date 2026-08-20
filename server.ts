import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = Number(process.env.PORT) || 3000;

/**
 * The model id was hard-coded as 'gemini-3.6-flash'. If that id is not enabled
 * on your key the request 500s and the app silently falls back to offline mode,
 * which looks like "the AI is broken". Override with GEMINI_MODEL if needed.
 */
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Lazy initialization of Gemini client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
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

// AI Financial Advisor Endpoints
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { messages, userContext } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        reply: "I'm My Paisa AI Assistant. (API Key not set in environment). Here is a standard recommendation based on your financial data: Keep your monthly savings above 20% and prioritize clearing high-interest debts first."
      });
    }

    const systemInstruction = `You are My Paisa, an expert AI Personal Financial Assistant developed by SIHFZ.
You provide clear, accurate, encouraging, and actionable financial advice.
User's Financial Context:
- Net Balance: $${userContext?.balance ?? 0}
- Monthly Income: $${userContext?.monthlyIncome ?? 0}
- Monthly Expenses: $${userContext?.monthlyExpenses ?? 0}
- Active Budgets: ${userContext?.budgetCount ?? 0} categories
- Active Savings Goals: ${userContext?.goalCount ?? 0} goals
- Borrowed / Lent Net: $${userContext?.borrowLendNet ?? 0}

Rules:
1. Always be professional, empathetic, and concise.
2. Provide concrete numbers and formulas when helpful (e.g. 50/30/20 budget rule).
3. Warn against high impulse spending if expenses exceed 70% of income.
4. Format output with clean Markdown formatting (bullet points, bold highlights).`;

    const formattedPrompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: formattedPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    res.json({ reply: response.text || "I analyzed your financial prompt. Keep tracking your daily transactions for higher precision!" });
  } catch (error: any) {
    console.error('Gemini Chat Error:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate AI advice' });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { transactions, budgets } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        analysis: {
          healthScore: 82,
          summary: "Your spending is healthy with strong emergency fund growth.",
          highlights: [
            "Food & Dining represents 34% of overall spending",
            "Subscription costs decreased by 12% this month",
            "On track to reach Savings Goal in 4.5 months"
          ],
          suggestions: [
            "Set a strict cap of $250/mo on entertainment to save an extra $60",
            "Consolidate outstanding lent balances to ensure early recovery"
          ]
        }
      });
    }

    const prompt = `Analyze these personal financial transactions and budgets:
Transactions: ${JSON.stringify(transactions?.slice(0, 30))}
Budgets: ${JSON.stringify(budgets)}

Provide a JSON output matching this structure:
{
  "healthScore": number (0 to 100),
  "summary": string,
  "highlights": string[],
  "suggestions": string[],
  "spendingHabitRisk": "low" | "medium" | "high",
  "predictedNextMonthExpense": number
}`;

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({ analysis: parsed });
  } catch (error: any) {
    console.error('Gemini Analyze Error:', error);
    res.status(500).json({ error: 'Failed to analyze spending' });
  }
});

/**
 * Optional server-side backup email.
 *
 * Disabled unless SMTP_HOST / SMTP_USER / SMTP_PASS are set, and `nodemailer`
 * is imported dynamically so the server still boots without it installed.
 * The app falls back to the device mail app when this returns an error, so
 * leaving it unconfigured is a supported setup — the APK never calls a server.
 */
app.post('/api/sync/email', async (req, res) => {
  const { to, backup, filename } = req.body ?? {};

  if (!to || !backup) {
    return res.status(400).json({ error: 'Both "to" and "backup" are required.' });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return res.status(501).json({
      error: 'Mail server not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS to enable this.',
    });
  }

  try {
    // @ts-expect-error - optional peer dependency; install with `npm i nodemailer`
    const { default: nodemailer } = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `My Paisa Backup - ${new Date().toLocaleDateString()}`,
      text: 'Your My Paisa backup is attached. Restore it from Settings > Restore Backup.',
      attachments: [
        {
          filename: filename || 'MyPaisa-Backup.json',
          content: backup,
          contentType: 'application/json',
        },
      ],
    });

    res.json({ sent: true });
  } catch (error: any) {
    console.error('Backup email error:', error);
    res.status(500).json({ error: error?.message || 'Failed to send backup email.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Paisa Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
