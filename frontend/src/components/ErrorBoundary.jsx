import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('UI error', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <h1 className="text-3xl font-semibold">This page hit a problem</h1>
        <p className="mt-2 text-muted">Your answers already submitted are saved. Reload the page to continue; if it happens again, contact support with the time it occurred.</p>
        <button className="btn-primary mt-6" onClick={() => location.reload()}>Reload page</button>
      </div>
    )
  }
}
