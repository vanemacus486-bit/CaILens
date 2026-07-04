/**
 * # MarkdownRenderer — 轻量 Markdown 富文本渲染
 *
 * 从旧版 AI 助手（已整体移除，见 git 历史 commit 0698232）裁剪而来，只保留纯文本排版：
 * 标题/段落/列表/引用/粗斜体/链接/行内代码/代码块/表格/分割线。
 * 不含内联数据可视化徽章、锚定高亮、事件引用等已随旧功能一起消失的特性。
 */

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const customComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-sans text-base font-semibold text-text-primary mt-4 mb-2 pb-1 border-b border-border-subtle">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-sans text-sm font-semibold text-text-primary mt-3 mb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-sans text-xs font-semibold text-text-secondary mt-2 mb-1">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="font-serif text-sm leading-relaxed my-1.5 text-text-primary">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside font-serif text-sm leading-relaxed text-text-primary space-y-0.5 my-1.5 ml-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside font-serif text-sm leading-relaxed text-text-primary space-y-0.5 my-1.5 ml-1">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-text-primary [&>p]:my-0 [&>p]:inline">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent pl-3 my-2 py-0.5 font-serif text-sm italic text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-xs bg-surface-base text-accent px-1 py-0.5 rounded">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="font-mono text-xs bg-surface-base text-text-primary p-3 rounded-lg overflow-x-auto my-2 border border-border-subtle">
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-accent underline decoration-accent/30 hover:decoration-accent/60 transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-xs font-mono border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-surface-base">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border-subtle last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 font-sans font-medium text-text-secondary text-[11px]">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-2 py-1 font-serif text-text-primary">{children}</td>,
  hr: () => <hr className="my-3 border-border-subtle" />,
}

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown components={customComponents} remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  )
}
