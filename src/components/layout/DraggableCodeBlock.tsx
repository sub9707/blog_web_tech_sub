import HeroTyping from '@/components/layout/HeroTyping';

const HERO_START_LINE = 3;
const HERO_ROWS = 6; // PHRASES.length

export default function DraggableCodeBlock() {
  return (
    <div className="hidden xl:flex flex-col gap-0.5 font-mono text-xs pt-1 shrink-0">
      {[1, 2].map((n) => (
        <div key={n} className="flex items-center gap-3 h-5 leading-5">
          <span className="text-gray-500 tabular-nums w-5 text-right">
            {String(n).padStart(2, '0')}
          </span>
        </div>
      ))}
      <HeroTyping startLine={HERO_START_LINE} />
      {Array.from({ length: 11 - 2 - HERO_ROWS }, (_, i) => HERO_START_LINE + HERO_ROWS + i).map((n) => (
        <div key={n} className="flex items-center gap-3 h-5 leading-5">
          <span className="text-gray-500 tabular-nums w-5 text-right">
            {String(n).padStart(2, '0')}
          </span>
        </div>
      ))}
    </div>
  );
}
