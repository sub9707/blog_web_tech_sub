const STACK = ['Next.js App Router', 'TypeScript', 'TailwindCSS', 'Markdown', 'Claude Code'];

export default function TechMarquee() {
  const items = [...STACK, ...STACK];

  return (
    <div className="marquee-pause relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-(--background) to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-(--background) to-transparent z-10" />
      <ul className="marquee-track flex w-max gap-8 text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-center gap-8">
            {item}
            <span className="text-gray-300 dark:text-navy-600">·</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
