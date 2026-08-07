import { Bot, UserRound } from "lucide-react";

export type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: number[];
};

type MessageBubbleProps = {
  message: ChatMessage;
};

const recognisedHeadings = [
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

export default function MessageBubble({
  message,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
          <Bot size={17} />
        </div>
      )}

      <div className="max-w-[85%] sm:max-w-2xl">
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
            isUser
              ? "rounded-br-md bg-slate-900 text-white"
              : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
          }`}
        >
          <div className="whitespace-pre-wrap">
            {message.content
              .split("\n")
              .map((line, index) => {
                const trimmedLine = line.trim();

                if (
                  recognisedHeadings.includes(
                    trimmedLine
                  )
                ) {
                  return (
                    <h3
                      key={`${message.id}-heading-${index}`}
                      className={`mb-2 mt-4 text-base font-bold ${
                        isUser
                          ? "text-white"
                          : "text-slate-900"
                      }`}
                    >
                      {trimmedLine}
                    </h3>
                  );
                }

                if (trimmedLine === "") {
                  return (
                    <br
                      key={`${message.id}-break-${index}`}
                    />
                  );
                }

                return (
                  <p
                    key={`${message.id}-line-${index}`}
                    className={`leading-7 ${
                      isUser
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
              <div
                className={`mt-3 flex flex-wrap gap-2 border-t pt-3 ${
                  isUser
                    ? "border-slate-700"
                    : "border-slate-200"
                }`}
              >
                <span
                  className={`text-xs font-semibold ${
                    isUser
                      ? "text-slate-300"
                      : "text-slate-500"
                  }`}
                >
                  Sources
                </span>

                {message.sources.map(
                  (pageNumber) => (
                    <span
                      key={`${message.id}-source-${pageNumber}`}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        isUser
                          ? "bg-slate-700 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      Page {pageNumber}
                    </span>
                  )
                )}
              </div>
            )}
        </div>
      </div>

      {isUser && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
          <UserRound size={17} />
        </div>
      )}
    </div>
  );
}