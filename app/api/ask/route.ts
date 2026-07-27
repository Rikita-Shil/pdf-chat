export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { GoogleGenAI } from "@google/genai";



type AskRequestBody = {
  question?: unknown;
  documentText?: unknown;
  documentName?: unknown;
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            "The Gemini API key is missing from the server environment.",
        },
        { status: 500 }
      );
    }

    const body = (await request.json()) as AskRequestBody;

    const question =
      typeof body.question === "string"
        ? body.question.trim()
        : "";

    const documentText =
      typeof body.documentText === "string"
        ? body.documentText.trim()
        : "";

    const documentName =
      typeof body.documentName === "string"
        ? body.documentName.trim()
        : "Uploaded PDF";

    if (!question) {
      return Response.json(
        { error: "Please provide a question." },
        { status: 400 }
      );
    }

    if (!documentText) {
      return Response.json(
        { error: "No extracted PDF text was provided." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are a document question-answering assistant.

Answer the user's question using only the supplied PDF text.

Rules:
1. Do not use outside knowledge.
2. Do not invent missing information.
3. If the answer is not present, say:
   "I could not find this information in the document."
4. Keep the answer clear and concise.
5. Refer to the document as "${documentName}" when useful.
6. Do not claim a page number unless it is clearly included in the supplied text.

DOCUMENT NAME:
${documentName}

PDF TEXT:
${documentText}


USER QUESTION:
${question}
    `.trim();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const answer = response.text?.trim();

    if (!answer) {
      return Response.json(
        {
          error: "Gemini did not return an answer.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      answer,
    });
  } catch (error) {
    console.error("Question answering error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unknown question-answering error.";

    return Response.json(
      {
        error: `The question could not be answered: ${message}`,
      },
      { status: 500 }
    );
  }
}