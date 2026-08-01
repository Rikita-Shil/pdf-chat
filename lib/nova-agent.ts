import {
  InMemorySessionService,
  LlmAgent,
  Runner,
} from "@google/adk";


const geminiApiKey = process.env.GEMINI_API_KEY;

if (geminiApiKey) {
  process.env.GOOGLE_GENAI_API_KEY = geminiApiKey;
}

const APP_NAME = "nova_pdf_chat";

export const novaAgent = new LlmAgent({
  name: "nova_pdf_assistant",
  description:
    "An assistant that answers questions about an uploaded PDF.",
  model: "gemini-flash-latest",
  instruction: `
You are Nova, a document question-answering assistant.

Your job is to answer questions using only the PDF text supplied in the
current user message.

Rules:

1. Use the current PDF text as the main source of truth.
2. Use the conversation session to understand follow-up questions.
3. Do not use outside knowledge.
4. Do not invent missing information.
5. If the answer is not available in the document, say:
   "I could not find this information in the document."
6. Keep answers clear and concise.
7. Do not claim page numbers unless they are included clearly in the text.
8. When the user says things such as "explain that", "tell me more",
   or "what about the second point", use the earlier conversation
   to understand what they mean.
  `.trim(),
});

/*
 * This is suitable for development only.
 * In-memory sessions disappear when the server restarts.
 */
export const sessionService =
  new InMemorySessionService();

export const novaRunner = new Runner({
  appName: APP_NAME,
  agent: novaAgent,
  sessionService,
});

export { APP_NAME };