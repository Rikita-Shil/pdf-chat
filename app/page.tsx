"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import type {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
} from "react";
import { useEffect, useRef, useState } from "react";

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

const initialDocuments: PdfDocument[] = [];
const initialMessages: Message[] = [];

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] =
    useState<PdfDocument[]>(initialDocuments);

  const [selectedDocumentId, setSelectedDocumentId] =
    useState<number | null>(null);

  const [messages, setMessages] =
    useState<Message[]>(initialMessages);

  const [question, setQuestion] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  const selectedDocument = documents.find(
    (document) => document.id === selectedDocumentId
  );

  const [anonymousUserId, setAnonymousUserId] =
  useState("");

const [sessionId, setSessionId] =
  useState("");

  useEffect(() => {
  let storedUserId =
    localStorage.getItem(
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
  setSessionId(crypto.randomUUID());
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

      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: `I’m reading ${file.name} and extracting its text now.`,
        },
      ]);

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

setMessages([
  {
    id: Date.now(),
    role: "assistant",
    content: `🎉 ${file.name} is ready! I extracted ${characterCount.toLocaleString()} characters from ${pageCount} pages. Ask me anything about this document.`,
  },
]);

        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content: `${file.name} is ready. I extracted ${result.characterCount.toLocaleString()} characters from ${result.pageCount} pages. Ask me anything about this document.`,
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

        setMessages([
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
  selectedDocument.status !== "ready" ||
  !selectedDocument.text ||
  !anonymousUserId ||
  !sessionId ||
  isAnswering
) {
  return;
}

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
    ]);

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
  sessionId,
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

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "The question could not be answered.";

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: errorMessage,
        },
      ]);
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

    if (document.status === "processing") {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content: `I’m still extracting text from ${document.name}.`,
        },
      ]);
      return;
    }

    if (document.status === "error") {
      setMessages([
        {
          id: Date.now(),
          role: "assistant",
          content:
            "This PDF could not be processed. Delete it and upload it again.",
        },
      ]);
      return;
    }

    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content: `${document.name} is selected and ready. What would you like to know?`,
      },
    ]);
  }

  function handleDeleteDocument(documentId: number) {
    const updatedDocuments = documents.filter(
      (document) => document.id !== documentId
    );

    setDocuments(updatedDocuments);

    if (selectedDocumentId === documentId) {
      const nextDocument = updatedDocuments[0];

      setSelectedDocumentId(nextDocument?.id ?? null);

      if (nextDocument) {
        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content:
              nextDocument.status === "ready"
                ? `${nextDocument.name} is now selected.`
                : `Selected ${nextDocument.name}.`,
          },
        ]);
      } else {
        setMessages([]);
      }
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
    <main className="min-h-screen from-indigo-100

via-white

to-cyan-100-slate-950 p-0 sm:p-5">
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
          <aside className="border-b border-slate-200 bg-slate-50 md:border-b-0 md:border-r">
            <div className="border-b border-slate-200 px-5 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Your documents
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {documents.length === 1
                      ? "1 PDF uploaded"
                      : `${documents.length} PDFs uploaded`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload another document"
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                >
                  <Plus size={19} />
                </button>
              </div>
            </div>

            <div className="space-y-3 p-4">
              {documents.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-slate-500 hover:bg-slate-50"
                >
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <FileText size={22} />
                  </div>

                  <p className="mt-3 text-sm font-semibold text-slate-800">
                     📄 Drop your PDF here

                    or click to browse

                    ✨ Supports resumes
                    📚 Books
                    📑 Assignments
                    📊 Reports
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Choose a text-based document up to 10 MB.
                  </p>
                </button>
              ) : (
                documents.map((document) => {
                  const isSelected =
                    document.id === selectedDocumentId;

                  return (
                    <div
                      key={document.id}
                      className={`group rounded-2xl border p-3 transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectDocument(document.id)
                          }
                          className="flex min-w-0 flex-1 items-start gap-3 text-left"
                        >
                          <div
                            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {document.status === "processing" ? (
                              <LoaderCircle
                                size={19}
                                className="animate-spin"
                              />
                            ) : (
                              <FileText size={19} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p
                              className={`truncate text-sm font-semibold ${
                                isSelected
                                  ? "text-white"
                                  : "text-slate-900"
                              }`}
                            >
                              {document.name}
                            </p>

                            <div
                              className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${
                                isSelected
                                  ? "text-slate-300"
                                  : "text-slate-500"
                              }`}
                            >
                              <span>{document.size}</span>

                              {document.pages > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{document.pages} pages</span>
                                </>
                              )}
                            </div>

                            <div className="mt-2">
                              {isSelected &&
                              document.status === "ready" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                                  <CheckCircle2 size={13} />
                                  Ready
                                </span>
                              ) : (
                                renderStatus(document)
                              )}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          aria-label={`Delete ${document.name}`}
                          onClick={() =>
                            handleDeleteDocument(document.id)
                          }
                          className={`rounded-lg p-2 transition ${
                            isSelected
                              ? "text-slate-400 hover:bg-white/10 hover:text-white"
                              : "text-slate-400 hover:bg-red-50 hover:text-red-600"
                          }`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

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
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                          <Bot size={17} />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] sm:max-w-2xl ${
                          message.role === "user"
                            ? "items-end"
                            : "items-start"
                        }`}
                      >
                        <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                            message.role === "user"
                              ? "rounded-br-md bg-slate-900 text-white"
                              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          <div className="whitespace-pre-wrap">
  {message.content.split("\n").map((line, index) => {
    const headings = [
      "Background",
      "Experience",
      "Skills",
      "Education",
      "Projects",
      "Summary",
      "Approach",
      "Interests",
      "Achievements",
      "Responsibilities",
      "Key Points",
      "Technologies",
    ];

    const trimmed = line.trim();

    if (headings.includes(trimmed)) {
      return (
        <h3
          key={index}
          className={`mt-4 mb-2 text-base font-bold ${
            message.role === "user"
              ? "text-white"
              : "text-slate-900"
          }`}
        >
          {trimmed}
        </h3>
      );
    }

    if (trimmed === "") {
      return <br key={index} />;
    }

    return (
      <p
        key={index}
        className={`leading-7 ${
          message.role === "user"
            ? "text-white"
            : "text-slate-800"
        }`}
      >
        {line}
      </p>
    );
  })}
</div>

                          {message.sources &&
                            message.sources.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                                <span className="text-xs font-semibold text-slate-500">
                                  Sources
                                </span>

                                {message.sources.map(
                                  (pageNumber) => (
                                    <span
                                      key={pageNumber}
                                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                                    >
                                      Page {pageNumber}
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                        </div>
                      </div>

                      {message.role === "user" && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                          <UserRound size={17} />
                        </div>
                      )}
                    </div>
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