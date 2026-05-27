import { SITE } from '@/constants/site';

export const metadata = {
  title: 'About',
  description: `${SITE.NAME} 소개`,
};

export default function AboutPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="font-serif text-5xl font-bold text-gray-900 mb-10">About</h1>

        <div className="space-y-6 text-gray-600 leading-relaxed text-sm">
          <p>안녕하세요. 개발하며 학습한 내용을 기록하는 기술 블로그입니다.</p>
          <p>
            DevOps, TypeScript, React, Next.js 등 프론트엔드 생태계와 개발 인프라에 대한 내용을
            주로 다룹니다. 실무에서 마주치는 문제와 해결 과정을 꾸준히 정리하고 공유합니다.
          </p>
          <p>
            이 블로그는 Next.js App Router 기반으로 제작되었으며, 마크다운 파일로 콘텐츠를
            관리합니다. 코드 하이라이팅, 목차 자동 생성, 반응형 디자인을 지원합니다.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="font-serif text-xl font-semibold text-gray-900 mb-4">Tech Stack</h2>
          <ul className="space-y-2 text-sm text-gray-500">
            <li>Next.js · App Router · TypeScript</li>
            <li>TailwindCSS · Playfair Display</li>
            <li>MDX · rehype-pretty-code · shiki</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
