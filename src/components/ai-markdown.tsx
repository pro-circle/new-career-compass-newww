import ReactMarkdown, { type Components } from "react-markdown";
import { memo } from "react";

/**
 * Styled markdown renderer for AI output. No typography plugin in this project,
 * so every element is mapped explicitly to design tokens. Supports a blinking
 * caret while a response is still streaming.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="mt-4 mb-2 text-base font-bold tracking-tight first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-2 text-sm font-bold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1.5 text-xs font-bold uppercase tracking-widest text-accent first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 space-y-1 pl-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="relative leading-relaxed [ul>&]:before:absolute [ul>&]:before:-left-3.5 [ul>&]:before:text-accent [ul>&]:before:content-['•']">
      {children}
    </li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-accent/50 pl-3 text-foreground/75 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  code: ({ children, className }) => {
    const block = /language-/.test(className ?? "");
    if (!block) {
      return (
        <code className="rounded bg-surface px-1 py-0.5 font-mono text-[0.85em] text-accent">
          {children}
        </code>
      );
    }
    return (
      <code className="block overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[0.85em] leading-relaxed">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-2 last:mb-0">{children}</pre>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-[0.9em]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border bg-surface px-2 py-1.5 font-semibold">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border/60 px-2 py-1.5">{children}</td>,
};

function AiMarkdownBase({
  children,
  streaming = false,
  className = "",
}: {
  children: string;
  streaming?: boolean;
  className?: string;
}) {
  return (
    <div className={`ai-markdown ${className}`}>
      <ReactMarkdown components={components}>{children}</ReactMarkdown>
      {streaming && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse rounded-full align-middle bg-accent"
        />
      )}
    </div>
  );
}

export const AiMarkdown = memo(AiMarkdownBase);
