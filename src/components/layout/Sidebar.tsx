import { SITE } from '@/constants/site';

interface ArchiveEntry {
  label: string;
  count: number;
}

interface Props {
  tags: string[];
  archive: ArchiveEntry[];
}

export default function Sidebar({ tags, archive }: Props) {
  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
          About
        </h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          {SITE.BIO}
        </p>
      </div>

      {tags.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2.5 py-1 border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {archive.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">
            Archive
          </h3>
          <ul className="space-y-2">
            {archive.slice(0, 8).map((entry) => (
              <li
                key={entry.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">{entry.label}</span>
                <span className="text-gray-400">({entry.count})</span>
              </li>
            ))}
            {archive.length > 8 && (
              <li className="text-sm text-gray-400">...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
