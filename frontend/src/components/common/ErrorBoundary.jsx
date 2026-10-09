import React, { Component } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import Button from './Button'
import './ErrorBoundary.css'

/**
 * Standard Design System ErrorBoundary component.
 * Catches render errors in subtree to prevent white-screen crashes.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[ErrorBoundary caught error]:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({
              error: this.state.error,
              resetErrorBoundary: this.handleReset,
            })
          : this.props.fallback
      }

      return (
        <div className="ui-error-boundary" role="alert" aria-live="assertive">
          <div className="ui-error-card">
            <div className="ui-error-icon-box" aria-hidden="true">
              <AlertTriangle size={28} />
            </div>

            <h3 className="ui-error-title">Đã xảy ra lỗi giao diện</h3>
            <p className="ui-error-desc">
              Thành phần này gặp sự cố trong quá trình kết xuất. Dữ liệu và các phân hệ khác của hệ thống vẫn hoạt động an toàn.
            </p>

            <div className="ui-error-actions">
              <Button
                variant="primary"
                size="sm"
                iconLeft={<RotateCcw size={14} />}
                onClick={this.handleReset}
              >
                Thử lại
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Home size={14} />}
                onClick={this.handleReload}
              >
                Tải lại trang
              </Button>
            </div>

            {this.state.error && (
              <details className="ui-error-details">
                <summary>Chi tiết lỗi kỹ thuật (dành cho lập trình viên)</summary>
                <pre className="ui-error-trace">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

