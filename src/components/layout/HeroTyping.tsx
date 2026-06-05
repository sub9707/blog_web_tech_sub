'use client';

import { useEffect, useState } from 'react';

const PHRASES = [
  'React에 빠진',
  '끈질기게 배우는',
  '트러블슈터',
  '클라이언트와 소통하는',
  '자동화를 사랑하는',
  '꼼꼼해지고 싶은',
];

const TYPE_SPEED = 70;
const DELETE_INTERVAL = 90;
const PAUSE_AFTER_TYPE = 1000;
const PAUSE_AFTER_ENTER = 1000;
const BLINK_PAUSE = 1600; // ~3 cursor blinks before deleting

// `const developer = [` = 19 chars
const INDENT_WIDTH = '19ch';

// Max rows: 5 committed + 1 active line (no entering for last phrase)
const TOTAL_ROWS = PHRASES.length;

type Phase = 'typing' | 'entering' | 'deleting';

interface Props {
  startLine?: number;
}

function Cursor() {
  return <span className="inline-block w-1.5 h-3.5 bg-gray-400/70 ml-0.5 align-middle animate-pulse" />;
}

function LineNum({ n }: { n: number }) {
  return (
    <span className="text-gray-300 tabular-nums w-5 text-right shrink-0">
      {String(n).padStart(2, '0')}
    </span>
  );
}

function CommittedLine({ phrase, isFirst }: { phrase: string; isFirst: boolean }) {
  if (isFirst) {
    return (
      <>
        <span className="text-purple-500">const </span>
        <span className="text-blue-500">developer</span>
        <span className="text-black"> = </span>
        <span className="text-black">{'['}</span>
        <span className="text-green-500">&apos;{phrase}&apos;</span>
        <span className="text-black">,</span>
      </>
    );
  }
  return (
    <>
      <span className="inline-block shrink-0" style={{ width: INDENT_WIDTH }} />
      <span className="text-green-500">&apos;{phrase}&apos;</span>
      <span className="text-black">,</span>
    </>
  );
}

export default function HeroTyping({ startLine = 3 }: Props) {
  const [committed, setCommitted] = useState<string[]>([]);
  const [typing, setTyping] = useState('');
  const [phase, setPhase] = useState<Phase>('typing');
  const [phraseIndex, setPhraseIndex] = useState(0);

  const isLast = phraseIndex === PHRASES.length - 1;
  const target =
    phraseIndex === 0
      ? `['${PHRASES[0]}',]`
      : `'${PHRASES[phraseIndex]}',`;

  useEffect(() => {
    if (phase === 'typing') {
      if (typing === target) {
        if (isLast) {
          // Last phrase: blink cursor then delete (no Enter)
          const t = setTimeout(() => setPhase('deleting'), BLINK_PAUSE);
          return () => clearTimeout(t);
        }
        const t = setTimeout(() => {
          setCommitted((prev) => [...prev, PHRASES[phraseIndex]]);
          setTyping('');
          setPhase('entering');
        }, PAUSE_AFTER_TYPE);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setTyping(target.slice(0, typing.length + 1));
      }, TYPE_SPEED);
      return () => clearTimeout(t);
    }

    if (phase === 'entering') {
      const t = setTimeout(() => {
        setPhraseIndex((i) => i + 1);
        setPhase('typing');
      }, PAUSE_AFTER_ENTER);
      return () => clearTimeout(t);
    }

    if (phase === 'deleting') {
      // Delete typing chars first, then pop committed one by one
      if (typing.length > 0) {
        const t = setTimeout(() => {
          setTyping((prev) => prev.slice(0, -1));
        }, DELETE_INTERVAL);
        return () => clearTimeout(t);
      }
      if (committed.length === 0) {
        setPhraseIndex(0);
        setPhase('typing');
        return;
      }
      const t = setTimeout(() => {
        setCommitted((prev) => prev.slice(0, -1));
      }, DELETE_INTERVAL);
      return () => clearTimeout(t);
    }
  }, [phase, typing, target, phraseIndex, isLast, committed.length]);

  // Build rows
  const rows: { lineNum: number; content: React.ReactNode }[] = [];

  if (committed.length === 0) {
    rows.push({
      lineNum: startLine,
      content: (
        <>
          <span className="text-purple-500">const </span>
          <span className="text-blue-500">developer</span>
          <span className="text-black"> = </span>
          <span className="text-black">{typing.length > 0 ? '[' : ''}</span>
          <span className="text-green-500">{typing.endsWith(']') ? typing.slice(1, -1) : typing.slice(1)}</span>
          <span className="text-black">{typing.endsWith(']') ? ']' : ''}</span>
          <Cursor />
        </>
      ),
    });
  } else {
    committed.forEach((phrase, i) => {
      rows.push({
        lineNum: startLine + i,
        content: <CommittedLine phrase={phrase} isFirst={i === 0} />,
      });
    });

    const lastLine = startLine + committed.length;

    if (phase === 'entering') {
      // ] on its own line waiting for next phrase
      rows.push({
        lineNum: lastLine,
        content: (
          <>
            <span className="inline-block shrink-0" style={{ width: INDENT_WIDTH }} />
            <span className="text-black">{']'}</span>
            <Cursor />
          </>
        ),
      });
    } else {
      // typing / deleting: show typing before ]
      rows.push({
        lineNum: lastLine,
        content: (
          <>
            <span className="inline-block shrink-0" style={{ width: INDENT_WIDTH }} />
            <span className="text-green-500">{typing}</span>
            <span className="text-black">{']'}</span>
            <Cursor />
          </>
        ),
      });
    }
  }

  // Pad to fixed height
  while (rows.length < TOTAL_ROWS) {
    rows.push({ lineNum: startLine + rows.length, content: null });
  }

  return (
    <>
      {rows.map(({ lineNum, content }) => (
        <div key={lineNum} className="flex items-center gap-3 h-5 leading-5">
          <LineNum n={lineNum} />
          {content && <span>{content}</span>}
        </div>
      ))}
    </>
  );
}
