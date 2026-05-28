import HeroTyping from '@/components/layout/HeroTyping';

export default function DraggableCodeBlock() {
  return (
    <div className="hidden xl:flex flex-col gap-0.5 font-mono text-xs pt-1 shrink-0">
      {Array.from({ length: 11 }, (_, i) => i + 1).map((n) => (
        <div key={n} className="flex items-center gap-3 h-5 leading-5">
          <span className="text-gray-300 tabular-nums w-5 text-right">{String(n).padStart(2, '0')}</span>
          {n === 6 && <HeroTyping />}
        </div>
      ))}
    </div>
  );
}
