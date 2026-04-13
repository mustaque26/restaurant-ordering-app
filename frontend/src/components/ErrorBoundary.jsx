;import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log the error for debugging
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:20}} className="card pad mb">
          <h2>Something went wrong</h2>
          <p className="muted">An unexpected error occurred while loading this page.</p>
          <pre style={{whiteSpace:'pre-wrap',color:'#b00'}}>{String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}</pre>
          <div style={{marginTop:12}}>
            <button onClick={() => window.location.reload()} className="subscribe-btn">Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

