import type { ReactNode } from 'react'

/** The glowing blue panel every screen is built from. */
export function SystemWindow({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`system-window ${className}`}>
      <header>
        <span className="system-icon" aria-hidden>!</span>
        <h2>{title}</h2>
      </header>
      {children}
    </section>
  )
}
