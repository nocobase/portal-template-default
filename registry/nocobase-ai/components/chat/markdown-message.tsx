import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownMessage({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
