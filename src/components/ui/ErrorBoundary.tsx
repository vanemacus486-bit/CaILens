import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

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
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="h-full flex flex-col items-center justify-center bg-surface-base text-text-primary p-8 gap-4">
        <AlertCircle className="h-10 w-10 text-color-text-danger" />
        <div className="text-center max-w-md">
          <h2 className="font-serif text-lg font-semibold mb-1 text-text-primary">
            Something went wrong
          </h2>
          <p className="font-sans text-sm text-text-secondary">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
        >
          Try Again
        </button>
      </div>
    )
  }
}
