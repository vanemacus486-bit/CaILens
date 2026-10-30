import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface Props {
  children: ReactNode
  /** 覆盖默认标题。用于区分「页面崩了」和「整个外壳崩了」 */
  title?: string
  /** compact：不占满整屏，用于包住局部区块（顶栏、弹窗） */
  compact?: boolean
  /** 崩溃时回调，便于上报或清理 */
  onError?: (error: Error) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 渲染期错误边界。
 *
 * 注意它接不住：异步 Promise、事件回调、定时器、文件监听里的抛错。
 * 那些由 `main.tsx` 的 installGlobalErrorHandlers 兜底。
 *
 * 覆盖策略（App.tsx 里挂了两层）：
 *  - 外层包 Layout 根部 —— 顶栏 / 侧栏 / Snackbar / 弹窗崩了不至于整页白屏
 *  - 内层包 <Outlet /> —— 单个页面崩了时，外壳还能用，可以切到别的页
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.props.onError?.(error)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { title, compact } = this.props
    const heading = title ?? '这一块出错了'
    const detail = this.state.error?.message ?? '未知错误'

    return (
      <div
        className={
          compact
            ? 'flex items-center gap-3 px-4 py-3 bg-surface-sunken border border-border-subtle rounded-md'
            : 'h-full flex flex-col items-center justify-center bg-surface-base text-text-primary p-8 gap-4'
        }
      >
        <AlertCircle
          className={compact ? 'h-4 w-4 shrink-0 text-color-text-danger' : 'h-10 w-10 text-color-text-danger'}
        />
        <div className={compact ? 'min-w-0 flex-1' : 'text-center max-w-md'}>
          <h2
            className={
              compact
                ? 'font-sans text-sm font-medium text-text-primary'
                : 'font-serif text-lg font-semibold mb-1 text-text-primary'
            }
          >
            {heading}
          </h2>
          <p
            className={
              compact
                ? 'mt-0.5 font-mono text-xs text-text-tertiary truncate'
                : 'font-sans text-sm text-text-secondary break-words'
            }
            title={detail}
          >
            {detail}
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className={
            compact
              ? 'inline-flex shrink-0 items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1 font-sans text-xs text-text-secondary transition-colors duration-200 hover:bg-surface-raised cursor-pointer bg-transparent'
              : 'inline-flex items-center justify-center gap-1.5 rounded-sm bg-accent text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer'
          }
        >
          <RotateCcw size={compact ? 12 : 14} strokeWidth={1.75} />
          {'重试'}
        </button>
      </div>
    )
  }
}
