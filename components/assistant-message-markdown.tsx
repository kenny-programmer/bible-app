"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders Gemini / model text that often includes Markdown (*bold*, lists, etc.). */
export function AssistantMessageMarkdown({ content }: { content: string }) {
  const components: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold text-[#222]">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    h1: ({ children }) => (
      <h4 className="mb-1 mt-2 font-serif text-base font-semibold first:mt-0">{children}</h4>
    ),
    h2: ({ children }) => (
      <h4 className="mb-1 mt-2 font-serif text-base font-semibold first:mt-0">{children}</h4>
    ),
    h3: ({ children }) => (
      <h4 className="mb-1 mt-2 font-serif text-[15px] font-semibold first:mt-0">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="mb-2 border-l-2 border-[#D4AF37]/45 pl-3 text-[#444] italic last:mb-0">
        {children}
      </blockquote>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="font-medium text-[#B8860B] underline decoration-[#D4AF37]/60 underline-offset-2 hover:text-[#996515]"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    code: ({ className, children, ...props }) => {
      const isFence = typeof className === "string" && className.includes("language-");
      if (isFence) {
        return (
          <code className={`${className} text-[13px]`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-[#f3f4f6] px-1 py-0.5 text-[13px] font-mono text-[#222]"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-2 max-w-full overflow-x-auto rounded-lg border border-[#333]/10 bg-[#f6f7f9] p-3 text-[13px] leading-relaxed last:mb-0">
        {children}
      </pre>
    ),
    hr: () => <hr className="my-3 border-[#D4AF37]/20" />,
  };

  return (
    <div className="chat-md break-words text-[15px] leading-relaxed text-[#333333]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
