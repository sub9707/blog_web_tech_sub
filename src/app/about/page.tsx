import { SITE } from '@/constants/site';
import ParticleColumn from '@/components/about/ParticleColumn';
import AboutHero from '@/components/about/AboutHero';
import TechMarquee from '@/components/about/TechMarquee';
import ScrollReveal from '@/components/common/ScrollReveal';
import ReadingProgressBar from '@/components/common/ReadingProgressBar';
import CountUp from '@/components/common/CountUp';
import TiltCard from '@/components/common/TiltCard';
import { getPosts } from '@/services/posts/getPosts';

export const metadata = {
  title: 'About',
  description: `${SITE.NAME} 소개`,
};

const TOPICS = [
  'TypeScript', 'React', 'Next.js', 'DevOps',
  'Node.js', 'Network', 'CS', 'Troubleshooting', 'Infrastructure',
];

const MYUNGJO_FONT = "'BookkMyungjo', serif";

export default async function AboutPage() {
  const posts = await getPosts();
  const categoryCount = new Set(posts.map((post) => post.category)).size;
  const firstYear = posts.reduce((earliest, post) => {
    const year = new Date(post.date).getFullYear();
    return Number.isNaN(year) ? earliest : Math.min(earliest, year);
  }, new Date().getFullYear());

  return (
    <div>

      <AboutHero />

      <ReadingProgressBar className="sticky top-14.25 z-40 h-0.75 bg-gray-200 dark:bg-navy-700" />

      <div className="max-w-6xl mx-auto px-6 py-16">

      {/* Body - 2 column */}
      <div className="flex gap-8 items-start">

        {/* Left: content */}
        <div className="flex-1 min-w-0 space-y-8">
<br />
        {/* Lede */}
        <ScrollReveal className="relative pl-8 pr-2 py-2 border-l-4 border-gray-500 dark:border-navy-400 italic">
          <span className="absolute top-0 left-2 font-serif text-6xl text-gray-300 dark:text-navy-600 leading-none select-none">&ldquo;</span>
          <p className="text-xl sm:text-2xl text-gray-800 dark:text-slate-300 leading-loose" style={{ fontFamily: MYUNGJO_FONT }}>
            <span className="block mb-1"> &nbsp; 여러 블로그를 전전하다, 유료 기능에 부닥쳐</span>
            <span className="block"><b>그냥 내가 만드는 게 낫겠다</b></span>
            <span className="block">라는 마음으로 시작한 개인 웹 테크 블로그입니다.<span className="font-serif text-5xl text-gray-300 dark:text-navy-600 leading-none select-none align-bottom">&rdquo;</span></span>
          </p>
        </ScrollReveal>
<br />

        <ScrollReveal className="space-y-5 text-lg text-gray-700 dark:text-slate-300 leading-loose">
          <p style={{ fontFamily: MYUNGJO_FONT }}>확실히 원하는 대로 커스텀 구현을 할 수 있는 게 너무 좋습니다.</p>
          <p style={{ fontFamily: MYUNGJO_FONT }}>블로그에 넣고 싶은 것을 다 넣을 수 있으니, 스스로 무궁무진한 시도가 기대됩니다.</p>
        </ScrollReveal>
        <br />

        <ScrollReveal className="space-y-5 text-lg text-gray-700 dark:text-slate-300 leading-loose">
          <p style={{ fontFamily: MYUNGJO_FONT }}>
            DevOps, TypeScript, React, Next.js 등 프론트엔드 생태계와 개발 인프라에 대한 내용을
            주로 다루며, 백엔드·네트워크·CS까지 범위를 넓혀가고 있습니다.
          </p>
          <p style={{ fontFamily: MYUNGJO_FONT }}>새로운 프레임워크나 언어에도 꾸준히 도전할 예정입니다.</p>
        </ScrollReveal>
        <br />

        <ScrollReveal className="space-y-5 text-lg text-gray-700 dark:text-slate-300 leading-loose">
          <p style={{ fontFamily: MYUNGJO_FONT }}>
            단순히 학습한 내용을 기록하는 것이 아니라, 누군가에게 설명한다면 어떻게 풀어낼까
            라는 마음가짐으로 포스팅을 작성합니다.
          </p>
          <p style={{ fontFamily: MYUNGJO_FONT }}>트러블슈팅 기록을 통해 마주쳤던 에러와 해결 방법을 오답노트처럼 남겨두고 있습니다.</p>
        </ScrollReveal>
<br />

        {/* Stats band */}
        <ScrollReveal className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-navy-700 border-y border-gray-200 dark:border-navy-700 py-6">
          <div className="text-center px-2">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-cormorant)' }}>
              <CountUp end={posts.length} />
            </div>
            <div className="mt-1 text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500">Posts</div>
          </div>
          <div className="text-center px-2">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-cormorant)' }}>
              <CountUp end={categoryCount} />
            </div>
            <div className="mt-1 text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500">Categories</div>
          </div>
          <div className="text-center px-2">
            <div className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100" style={{ fontFamily: 'var(--font-cormorant)' }}>
              <CountUp end={firstYear} duration={1600} />
            </div>
            <div className="mt-1 text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500">Since</div>
          </div>
        </ScrollReveal>
        <br />

        <ScrollReveal>
          <TiltCard className="rounded-lg border border-gray-200 dark:border-navy-700 p-6 space-y-4 text-lg text-gray-600 dark:text-slate-400 leading-loose">
          <h2 className="font-serif text-2xl font-bold text-gray-900 dark:text-slate-200">Technical Notes</h2>
          <p>
            본 블로그는 개인 홈서버 배포용·학습용으로 SEO는 별도로 기획하지 않았습니다.
            데이터베이스 없이 빌드 타임에 콘텐츠를 처리하여 가장 빠른 방식으로 포스팅을
            제공하는 구조를 지향합니다.
          </p>
          <p>
            Claude Code와의 페어 프로그래밍으로 리팩토링 및 코드 산출을 함께 진행하고 있습니다.
          </p>
          <a
            href="https://subdevpi.mywire.org/posts/DevOps/%EB%9D%BC%EC%A6%88%EB%B2%A0%EB%A6%AC%ED%8C%8C%EC%9D%B4-%ED%99%88%EC%84%9C%EB%B2%84%EC%97%90-Next.js-%EB%B8%94%EB%A1%9C%EA%B7%B8-%EB%B0%B0%ED%8F%AC%ED%95%98%EA%B8%B0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-gray-500 dark:text-slate-400 underline underline-offset-4 decoration-gray-300 dark:decoration-navy-500 hover:text-gray-900 dark:hover:text-slate-200 hover:decoration-gray-600 dark:hover:decoration-navy-400 transition-colors"
          >
            CI/CD와 배포 구현 플로우 포스팅
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 7h10v10M7 17 17 7" />
            </svg>
          </a>
          </TiltCard>
        </ScrollReveal>

        <br /><br /><br />
        <ScrollReveal>
          <h2 className="text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500 pb-3 mb-4 border-b border-gray-200 dark:border-navy-700">
            Topics
          </h2>
          <div className="flex flex-wrap gap-3">
            {TOPICS.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1.5 text-xs border border-gray-300 dark:border-navy-600 text-gray-600 dark:text-slate-400 tracking-wide bg-gray-50 dark:bg-navy-800/60 shadow-sm transition-transform duration-200 hover:scale-110 hover:border-gray-500 dark:hover:border-navy-400 hover:text-gray-900 dark:hover:text-slate-200"
              >
                {topic}
              </span>
            ))}
          </div>
        </ScrollReveal>

        <br /><br /><br />
        <ScrollReveal>
          <h2 className="text-xs tracking-widest uppercase text-gray-400 dark:text-slate-500 pb-3 mb-4 border-b border-gray-200 dark:border-navy-700">
            Built with
          </h2>
          <TechMarquee />
        </ScrollReveal>

        </div>

        {/* Right: particle canvas */}
        <div className="hidden lg:block shrink-0 self-stretch">
          <ParticleColumn />
        </div>

      </div>
      </div>
    </div>
  );
}
