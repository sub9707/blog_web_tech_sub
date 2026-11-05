import type { ReactNode } from 'react'
import clsx from 'clsx'

export type CalloutVariant = 'note' | 'point' | 'target'

interface Props {
  title?: string
  variant?: CalloutVariant
  children: ReactNode
}

const VARIANT_STYLES: Record<CalloutVariant, string> = {
  note: 'border-gray-200 bg-gray-50 dark:border-navy-600 dark:bg-navy-800',
  point: 'border-gray-900 bg-white dark:border-slate-300 dark:bg-navy-900',
  target: 'border-gray-200 bg-white dark:border-navy-600 dark:bg-navy-900',
}

const LABEL_STYLES: Record<CalloutVariant, string> = {
  note: 'text-gray-500 dark:text-slate-400',
  point: 'text-gray-900 dark:text-slate-200',
  target: 'text-gray-500 dark:text-slate-400',
}

export default function Callout({ title, variant = 'note', children }: Props) {
  return (
    <aside
      className={clsx(
        'my-6 border-l-2 px-5 py-4',
        variant === 'target' && 'border',
        VARIANT_STYLES[variant],
      )}
    >
      {title && (
        <p className={clsx('mt-0! mb-2! text-xs font-semibold tracking-wide', LABEL_STYLES[variant])}>
          {title}
        </p>
      )}
      <div className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </aside>
  )
}
