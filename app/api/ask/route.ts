export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  APP_NAME,
  novaRunner,
  sessionService,
} from "@/lib/nova-agent";

type AskRequestBody = {
  question?: unknown;
  documentText?: unknown;
  documentName?: unknown;
  sessionId?: unknown;
  userId?: unknown;
};

function readTextFromEvent(event: unknown): string {
  if (
    !event ||
    typeof event !== "object" ||
    !("content" in event)
  ) {
    return "";
  }

  const content = (
    event as {
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }
  ).content;

  return (
    content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim() ?? ""
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        {
          error:
            "The Gemini API key is missing from the server environment.",
        },
        { status: 500 }
      );
    }

    const body =
      (await request.json()) as AskRequestBody;

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

    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId.trim()
        : "";

    const userId =
      typeof body.userId === "string"
        ? body.userId.trim()
        : "";

    if (!question) {
      return Response.json(
        {
          error: "Please provide a question.",
        },
        { status: 400 }
      );
    }

    if (!documentText) {
      return Response.json(
        {
          error:
            "No extracted PDF text was provided.",
        },
        { status: 400 }
      );
    }

    if (!sessionId || !userId) {
      return Response.json(
        {
          error:
            "A session ID and anonymous user ID are required.",
        },
        { status: 400 }
      );
    }

    /*
     * Try to retrieve the existing conversation.
     */
    let session =
      await sessionService.getSession({
        appName: APP_NAME,
        userId,
        sessionId,
      });

    /*
     * Create it when this is the first message.
     */
    if (!session) {
      session =
        await sessionService.createSession({
          appName: APP_NAME,
          userId,
          sessionId,
          state: {
            documentName,
          },
        });
    }

    const message = `
CURRENT DOCUMENT:
${documentName}

CURRENT PDF TEXT:
${documentText}

USER QUESTION:
${question}
    `.trim();

    const events = novaRunner.runAsync({
      userId,
      sessionId: session.id,
      newMessage: {
        role: "user",
        parts: [
          {
            text: message,
          },
        ],
      },
    });

    let answer = "";

    for await (const event of events) {
      const eventText =
        readTextFromEvent(event);

      if (eventText) {
        answer = eventText;
      }
    }

    if (!answer) {
      return Response.json(
        {
          error:
            "Nova did not return an answer.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      answer,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(
      "Nova ADK question-answering error:",
      error
    );

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