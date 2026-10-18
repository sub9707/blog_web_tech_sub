import { NEWS_PIPELINE } from '@/constants/news';

export default function NewsPipelineIntro() {
  return (
    <section aria-labelledby="news-pipeline-heading" className="mb-12">
      <h2
        id="news-pipeline-heading"
        className="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-slate-500 mb-4"
      >
        How it works
      </h2>
      <ol className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100 dark:bg-navy-700 border border-gray-100 dark:border-navy-700">
        {NEWS_PIPELINE.map((step, index) => (
          <li key={step.title} className="bg-white dark:bg-navy-900 p-5">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-gray-400 dark:text-slate-500">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-200">{step.title}</h3>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
