import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
}) => {
  const renderMarkdown = (text: string): React.ReactNode => {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Headers
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
            {line.slice(4)}
          </h3>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={i} className="text-xl font-bold mt-4 mb-2">
            {line.slice(3)}
          </h2>
        );
      } else if (line.startsWith("# ")) {
        elements.push(
          <h1 key={i} className="text-2xl font-bold mt-4 mb-2">
            {line.slice(2)}
          </h1>
        );
      }
      // Bold text
      else if (line.includes("**")) {
        const parts = line.split("**");
        const formatted = parts.map((part, idx) =>
          idx % 2 === 1 ? <strong key={idx}>{part}</strong> : part
        );
        elements.push(
          <p key={i} className="mb-2">
            {formatted}
          </p>
        );
      }
      // Bullet points
      else if (line.startsWith("- ") || line.startsWith("* ")) {
        const bulletText = line.slice(2);
        elements.push(
          <li key={i} className="ml-4 mb-1">
            • {bulletText}
          </li>
        );
      }
      // Code blocks (simple)
      else if (line.startsWith("```")) {
        // Skip opening/closing code fence
        continue;
      }
      // Empty lines
      else if (line.trim() === "") {
        elements.push(<br key={i} />);
      }
      // Regular text
      else {
        elements.push(
          <p key={i} className="mb-2">
            {line}
          </p>
        );
      }
    }

    return <>{elements}</>;
  };

  return (
    <div className={`break-words ${className}`}>{renderMarkdown(content)}</div>
  );
};
