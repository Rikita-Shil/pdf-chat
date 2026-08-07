"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  
  Send,
  Sparkles,

  Upload,
  UserRound,
} 
from "lucide-react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import DocumentSidebar from "./components/DocumentSidebar";
import MessageBubble from "./components/MessageBubble";


type DocumentStatus = "processing" | "ready" | "error";

type PdfDocument = {
  id: number;
  name: string;
  size: string;
  pages: number;
  text: string;
  status: DocumentStatus;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: number[];
};

type ExtractPdfResponse = {
  fileName?: string;
  pageCount?: number;
  text?: string;
  characterCount?: number;
  error?: string;
};

type AskPdfResponse = {
  answer?: string;
  error?: string;
};
type ChatThread = {
  sessionId: string;
  messages: Message[];
};

const initialDocuments: PdfDocument[] = [];


export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] =
    useState<PdfDocument[]>(initialDocuments);

  const [selectedDocumentId, setSelectedDocumentId] =
    useState<number | null>(null);

  const [chatThreads, setChatThreads] = useState<
  Record<number, ChatThread>
>({});

  const [question, setQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId
  );
  const selectedThread =
  selectedDocumentId !== null
    ? chatThreads[selectedDocumentId]
    : undefined;

const messages = selectedThread?.messages ?? [];

  const [anonymousUserId, setAnonymousUserId] =
  useState("");



  useEffect(() => {
  let storedUserId = localStorage.getItem(
    "nova-anonymous-user-id"
  );

  if (!storedUserId) {
    storedUserId = crypto.randomUUID();

    localStorage.setItem(
      "nova-anonymous-user-id",
      storedUserId
    );
  }

  setAnonymousUserId(storedUserId);
}, []);
  const canAskQuestion =
    selectedDocument?.status === "ready";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isAnswering]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} bytes`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  function replaceDocumentMessages(
  documentId: number,
  newMessages: Message[]
) {
  setChatThreads((currentThreads) => ({
    ...currentThreads,
    [documentId]: {
      sessionId:
        currentThreads[documentId]?.sessionId ??
        crypto.randomUUID(),
      messages: newMessages,
    },
  }));
}

function appendDocumentMessage(
  documentId: number,
  newMessage: Message
) {
  setChatThreads((currentThreads) => {
    const currentThread =
      currentThreads[documentId] ?? {
        sessionId: crypto.randomUUID(),
        messages: [],
      };

    return {
      ...currentThreads,
      [documentId]: {
        ...currentThread,
        messages: [
          ...currentThread.messages,
          newMessage,
        ],
      },
    };
  });
}

  async function handleFileSelection(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const invalidFiles = selectedFiles.filter(
      (file) =>
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
    );

    if (invalidFiles.length > 0) {
      window.alert("Only PDF files are allowed.");
      return;
    }

    const maximumFileSize = 10 * 1024 * 1024;

    const oversizedFiles = selectedFiles.filter(
      (file) => file.size > maximumFileSize
    );

    if (oversizedFiles.length > 0) {
      window.alert("Each PDF must be smaller than 10 MB.");
      return;
    }

    for (const [index, file] of selectedFiles.entries()) {
      const documentId = Date.now() + index;

      const processingDocument: PdfDocument = {
        id: documentId,
        name: file.name,
        size: formatFileSize(file.size),
        pages: 0,
        text: "",
        status: "processing",
      };

      setDocuments((currentDocuments) => [
        ...currentDocuments,
        processingDocument,
      ]);

      setSelectedDocumentId(documentId);
      setChatThreads((currentThreads) => ({
  ...currentThreads,
  [documentId]: {
    sessionId: crypto.randomUUID(),
    messages: [
      {
        id: Date.now(),
        role: "assistant",
        content: `I’m reading ${file.name} and extracting its text now.`,
      },
    ],
  },
}));

   

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/extract-pdf", {
          method: "POST",
          body: formData,
        });

        const result =
          (await response.json()) as ExtractPdfResponse;

        if (!response.ok) {
          throw new Error(
            result.error ?? "The PDF could not be processed."
          );
        }

        if (
          typeof result.text !== "string" ||
          typeof result.pageCount !== "number" ||
          typeof result.characterCount !== "number"
        ) {
          throw new Error(
            "The PDF extraction service returned an invalid response."
          );
        }

          const extractedText = result.text;
const pageCount = result.pageCount;
const characterCount = result.characterCount;

setDocuments((currentDocuments) =>
  currentDocuments.map((document) =>
    document.id === documentId
      ? {
          ...document,
          pages: pageCount,
          text: extractedText,
          status: "ready" as const,
        }
      : document
  )
);

replaceDocumentMessages(documentId, [
  {
    id: Date.now(),
    role: "assistant",
    content: `🎉 ${file.name} is ready! I extracted ${characterCount.toLocaleString()} characters from ${pageCount} pages. Ask me anything about this document.`,
  },
]);

        
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "The PDF could not be processed.";

        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === documentId
              ? {
                  ...document,
                  status: "error",
                }
              : document
          )
        );

        replaceDocumentMessages(documentId, [
  {
    id: Date.now(),
    role: "assistant",
    content: errorMessage,
  },
]);
      }
    }
  }

  async function handleQuestionSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

  if (
  !trimmedQuestion ||
  !selectedDocument ||
  !selectedThread ||
  selectedDocument.status !== "ready" ||
  !selectedDocument.text ||
  !anonymousUserId ||
  isAnswering
) {
  return;
}

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
    };

    appendDocumentMessage(
  selectedDocument.id,
  userMessage
);
    setQuestion("");
    setIsAnswering(true);

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  question: trimmedQuestion,
  documentText: selectedDocument.text,
  documentName: selectedDocument.name,
  userId: anonymousUserId,
  sessionId: selectedThread.sessionId,
}),
      });

      const result =
        (await response.json()) as AskPdfResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "The question could not be answered."
        );
      }

      if (!result.answer) {
        throw new Error("The AI returned an empty answer.");
      }

      const assistantMessage: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.answer,
      };

    appendDocumentMessage(
  selectedDocument.id,
  assistantMessage
);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The question could not be answered.";

      appendDocumentMessage(selectedDocument.id, {
  id: Date.now() + 1,
  role: "assistant",
  content: errorMessage,
});
    } finally {
      setIsAnswering(false);
    }
  }

  function handleQuestionKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  function handleSelectDocument(documentId: number) {
  const document = documents.find(
    (item) => item.id === documentId
  );

  if (!document) {
    return;
  }

  setSelectedDocumentId(documentId);
}

  function handleDeleteDocument(documentId: number) {
  const updatedDocuments = documents.filter(
    (document) => document.id !== documentId
  );

  setDocuments(updatedDocuments);

  setChatThreads((currentThreads) => {
    const updatedThreads = { ...currentThreads };
    delete updatedThreads[documentId];
    return updatedThreads;
  });

  if (selectedDocumentId === documentId) {
    const nextDocument = updatedDocuments[0];

    setSelectedDocumentId(nextDocument?.id ?? null);
  }
}
  function renderStatus(document: PdfDocument) {
    if (document.status === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
          <LoaderCircle size={13} className="animate-spin" />
          📖 Reading your PDF...
        </span>
      );
    }

    if (document.status === "error") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertCircle size={13} />
          😢 Couldn't read it
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <CheckCircle2 size={13} />
        🎉 Ready to chat!
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-white to-cyan-100 p-0 sm:p-5">
      <section className="mx-auto flex min-h-screen max-w-[1500px] flex-col overflow-hidden bg-white sm:min-h-[calc(100vh-40px)] sm:rounded-3xl sm:border sm:border-slate-800 sm:shadow-2xl">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileSelection}
          className="hidden"
        />

        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Sparkles size={21} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-950 sm:text-xl">
                PDF Chats
              </h1>

              <p className="text-xs text-slate-500 sm:text-sm">
                Your intelligent PDF companion 🤖
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Upload size={17} />
            <span className="hidden sm:inline">Upload PDF</span>
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
<DocumentSidebar
  documents={documents}
  selectedDocumentId={selectedDocumentId}
  onUploadClick={() =>
    fileInputRef.current?.click()
  }
  onSelectDocument={handleSelectDocument}
  onDeleteDocument={handleDeleteDocument}
/>

          <section className="flex min-h-[650px] flex-col bg-white">
            <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
              {selectedDocument ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <FileText size={21} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Chatting with
                      </p>

                      <h2 className="mt-1 truncate font-semibold text-slate-950">
                        {selectedDocument.name}
                      </h2>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{selectedDocument.size}</span>

                        {selectedDocument.pages > 0 && (
                          <>
                            <span>•</span>
                            <span>
                              {selectedDocument.pages} pages
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                    {renderStatus(selectedDocument)}
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Current document
                  </p>

                  <h2 className="mt-1 font-semibold text-slate-900">
                    No PDF selected
                  </h2>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-slate-50 px-4 py-6 sm:px-8">
              {messages.length === 0 && !isAnswering ? (
                <div className="flex min-h-full items-center justify-center">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                      <Bot size={29} />
                              
                    </div>

                    <h3 className="mt-5 text-xl font-bold text-slate-950">
                      👋 Welcome!

                            Let's make reading easier.

                            Upload any PDF and chat with it naturally.
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                     💬 Try asking

"What are the key skills?"

"Summarise this PDF."

"What experience does this person have?"

"What are the important dates?"
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      <Upload size={17} />
                      Choose a PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-4xl space-y-6">
                  {messages.map((message) => (
  <MessageBubble
    key={message.id}
    message={message}
  />
))}

                  {isAnswering && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Bot size={17} />
                      </div>

                      <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3 text-sm text-slate-600">
                          <LoaderCircle
                            size={17}
                            className="animate-spin"
                          />

                          <span>
                            🤖 Nova is thinking...

                          📖 Reading your PDF

                          🧠 Understanding context

                          ✨ Writing your answer...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <form
              onSubmit={handleQuestionSubmit}
              className="border-t border-slate-200 bg-white px-4 py-4 sm:px-7 sm:py-5"
            >
              <div className="mx-auto max-w-4xl">
                <div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-slate-700 focus-within:shadow-md">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={question}
                      onChange={(event) =>
                        setQuestion(event.target.value)
                      }
                      onKeyDown={handleQuestionKeyDown}
                      placeholder={
                        isAnswering
                          ? "Preparing your answer..."
                          : canAskQuestion
                            ? `Ask anything about ${selectedDocument?.name}...`
                            : selectedDocument?.status ===
                                "processing"
                              ? "Please wait while the PDF is being read..."
                              : "Upload a valid PDF to begin chatting..."
                      }
                      rows={1}
                      disabled={
                        !canAskQuestion || isAnswering
                      }
                      className="max-h-36 min-h-12 flex-1 resize-none border-none bg-transparent px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                    />

                    <button
                      type="submit"
                      disabled={
                        !question.trim() ||
                        !canAskQuestion ||
                        isAnswering
                      }
                      aria-label="Send question"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                <p className="mt-2 text-center text-xs text-slate-400">
                  Answers are generated only from the selected
                  PDF.
                </p>
              </div>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}