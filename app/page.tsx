"use client";

import {
  FileText,
  LoaderCircle,
  Plus,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useRef, useState } from "react";

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
    const selectedFiles = Array.from(event.target.files ?? []);

    // Allows the same file to be selected again later.
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
          content: `Extracting text from ${file.name}...`,
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

        setDocuments((currentDocuments) =>
          currentDocuments.map((document) =>
            document.id === documentId
              ? {
                  ...document,
                  pages: result.pageCount ?? 0,
                  text: result.text ?? "",
                  status: "ready",
                }
              : document
          )
        );

        setMessages([
          {
            id: Date.now(),
            role: "assistant",
            content: `Your PDF is ready. I extracted ${result.characterCount.toLocaleString()} characters from ${result.pageCount} pages.`,
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
      throw new Error(
        "The AI returned an empty answer."
      );
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

    const assistantErrorMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: errorMessage,
    };

    setMessages((currentMessages) => [
      ...currentMessages,
      assistantErrorMessage,
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
          content: `Text is still being extracted from ${document.name}.`,
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
            "This PDF could not be processed. Delete it and try uploading it again.",
        },
      ]);

      return;
    }

    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content: `${document.name} is ready. Ask a question about this document.`,
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
                ? `${nextDocument.name} is selected. Ask a question about it.`
                : `Selected ${nextDocument.name}.`,
          },
        ]);
      } else {
        setMessages([]);
      }
    }
  }

  const canAskQuestion =
    selectedDocument?.status === "ready";

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-6">
      <section className="mx-auto flex min-h-[calc(100vh-24px)] max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[calc(100vh-48px)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFileSelection}
          className="hidden"
        />

        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              PDF Chat AI
            </h1>

            <p className="text-sm text-slate-500">
              Upload a PDF and ask questions about it
            </p>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Upload size={17} />

            <span className="hidden sm:inline">
              Upload PDF
            </span>
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 md:grid-cols-[300px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50 p-4 md:border-b-0 md:border-r">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Documents
                </h2>

                <p className="text-xs text-slate-500">
                  {documents.length} uploaded
                </p>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload a document"
                className="rounded-md p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center">
                  <FileText
                    className="mx-auto mb-2 text-slate-400"
                    size={28}
                  />

                  <p className="text-sm font-medium text-slate-700">
                    No PDFs uploaded
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Upload your first document to begin.
                  </p>
                </div>
              ) : (
                documents.map((document) => {
                  const isSelected =
                    document.id === selectedDocumentId;

                  return (
                    <div
                      key={document.id}
                      className={`group flex w-full items-center gap-3 rounded-xl border p-3 transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectDocument(document.id)
                        }
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        {document.status === "processing" ? (
                          <LoaderCircle
                            size={20}
                            className="shrink-0 animate-spin"
                          />
                        ) : (
                          <FileText
                            size={20}
                            className={`shrink-0 ${
                              isSelected
                                ? "text-white"
                                : "text-slate-500"
                            }`}
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {document.name}
                          </p>

                          <p
                            className={`text-xs ${
                              isSelected
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {document.status === "processing"
                              ? "Extracting text..."
                              : document.status === "error"
                                ? "Processing failed"
                                : `${document.size}${
                                    document.pages > 0
                                      ? ` • ${document.pages} pages`
                                      : ""
                                  }`}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete ${document.name}`}
                        onClick={() =>
                          handleDeleteDocument(document.id)
                        }
                        className={`shrink-0 rounded-md p-1.5 transition ${
                          isSelected
                            ? "text-slate-300 hover:bg-slate-700 hover:text-white"
                            : "text-slate-400 hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </aside>

          <section className="flex min-h-[600px] flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current document
              </p>

              <h2 className="mt-1 font-semibold text-slate-900">
                {selectedDocument?.name ??
                  "Upload or select a document"}
              </h2>

              {selectedDocument && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedDocument.status === "processing"
                    ? "Extracting PDF text..."
                    : selectedDocument.status === "error"
                      ? "PDF processing failed"
                      : `${selectedDocument.pages} pages ready`}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-8">
  {messages.length === 0 && !isAnswering ? (
    <div className="flex h-full min-h-72 items-center justify-center">
      <div className="max-w-sm text-center">
        <FileText
          size={42}
          className="mx-auto text-slate-300"
        />

        <h3 className="mt-4 font-semibold text-slate-800">
          Upload a PDF to begin
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Text-based PDFs up to 10 MB are supported.
        </p>
      </div>
    </div>
  ) : (
    <>
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.role === "user"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div
            className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-6 ${
              message.role === "user"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-800"
            }`}
          >
            <p>{message.content}</p>

            {message.sources &&
              message.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Sources:
                  </span>

                  {message.sources.map((pageNumber) => (
                    <span
                      key={pageNumber}
                      className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      Page {pageNumber}
                    </span>
                  ))}
                </div>
              )}
          </div>
        </div>
      ))}

      {isAnswering && (
        <div className="flex justify-start">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            <span>
              Reading the PDF and preparing an answer...
            </span>
          </div>
        </div>
      )}
    </>
  )}
</div>
           
            <form
              onSubmit={handleQuestionSubmit}
              className="border-t border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex items-end gap-3 rounded-xl border border-slate-300 bg-white p-2 focus-within:border-slate-700">
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
        ? "Ask a question about this PDF..."
        : selectedDocument?.status === "processing"
          ? "Please wait while the PDF is processed..."
          : "Upload a valid PDF to ask questions..."
  }
  rows={1}
  disabled={!canAskQuestion || isAnswering}
  className="max-h-32 min-h-11 flex-1 resize-none border-none px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-white"
/>

                <button
                  type="submit"
                  disabled={
                    !question.trim() ||
                    !canAskQuestion ||
                    isAnswering
                  }
                                    aria-label="Send question"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Send size={18} />
                </button>
              </div>

              <p className="mt-2 text-center text-xs text-slate-400">
                Answers will be generated from the selected
                PDF.
              </p>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}