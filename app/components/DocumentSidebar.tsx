import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";

export type DocumentStatus =
  | "processing"
  | "ready"
  | "error";

export type PdfDocument = {
  id: number;
  name: string;
  size: string;
  pages: number;
  text: string;
  status: DocumentStatus;
};

type DocumentSidebarProps = {
  documents: PdfDocument[];
  selectedDocumentId: number | null;
  onUploadClick: () => void;
  onSelectDocument: (documentId: number) => void;
  onDeleteDocument: (documentId: number) => void;
};

function DocumentStatusLabel({
  document,
  isSelected,
}: {
  document: PdfDocument;
  isSelected: boolean;
}) {
  if (document.status === "processing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600">
        <LoaderCircle
          size={13}
          className="animate-spin"
        />
        📖 Reading your PDF...
      </span>
    );
  }

  if (document.status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        😢 Could not read it
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
        isSelected
          ? "text-emerald-300"
          : "text-emerald-600"
      }`}
    >
      <CheckCircle2 size={13} />
      🎉 Ready to chat!
    </span>
  );
}

export default function DocumentSidebar({
  documents,
  selectedDocumentId,
  onUploadClick,
  onSelectDocument,
  onDeleteDocument,
}: DocumentSidebarProps) {
  return (
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
            onClick={onUploadClick}
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
            onClick={onUploadClick}
            className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-slate-500 hover:bg-slate-50"
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FileText size={22} />
            </div>

            <p className="mt-3 text-sm font-semibold text-slate-800">
              📄 Upload your first PDF
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Supports resumes, books, assignments,
              reports, and other text-based PDFs.
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Maximum file size: 10 MB
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
                      onSelectDocument(document.id)
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
                      {document.status ===
                      "processing" ? (
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
                            <span>
                              {document.pages} pages
                            </span>
                          </>
                        )}
                      </div>

                      <div className="mt-2">
                        <DocumentStatusLabel
                          document={document}
                          isSelected={isSelected}
                        />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${document.name}`}
                    onClick={() =>
                      onDeleteDocument(document.id)
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
  );
}