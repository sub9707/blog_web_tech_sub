'use client';

import dynamic from 'next/dynamic';

const ParticleText = dynamic(() => import('./ParticleText'), { ssr: false });

export default function ParticleColumn() {
  return (
    <div className="h-full">
      <div className="sticky" style={{ top: 'calc(50vh - 210px)', width: 420 }}>
        <div style={{ height: 420 }}>
          <ParticleText />
        </div>
        <p className="text-sm text-gray-500 text-center mt-2 tracking-wide animate-pulse">
          글자를 드래그·호버 해보세요!
        </p>
      </div>
    </div>
  );
}
