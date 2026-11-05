import type { ReactNode } from 'react'

interface Props {
  title?: string
  children: ReactNode
}

export default function Roadmap({ title, children }: Props) {
  return (
    <section className="roadmap my-8">
      {title && (
        <p className="mt-0! mb-4! text-xs font-semibold tracking-wide text-gray-500 dark:text-slate-400">
          {title}
        </p>
      )}
      {children}
    </section>
  )
}
