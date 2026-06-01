import Image from 'next/image'
import type { OgData } from '@/utils/fetchOgData'

interface Props {
  url: string
  ogData: OgData
}

export default function BookmarkCard({ url, ogData }: Props) {
  const { title, description, image, siteName, favicon } = ogData
  const displayHost = (() => {
    try { return new URL(url).hostname } catch { return url }
  })()

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="not-prose flex items-stretch min-h-24 overflow-hidden border border-gray-200 hover:border-gray-400 bg-white transition-colors my-4 [text-decoration:none]"
    >
      <div className="flex flex-col flex-1 min-w-0 px-4 py-3 gap-1">
        <p className="text-sm font-medium text-gray-900 truncate [text-decoration:none]">
          {title}
        </p>
        {description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-auto pt-2">
          {favicon && (
            <Image src={favicon} alt="" width={12} height={12} className="shrink-0" unoptimized />
          )}
          <span className="text-xs text-gray-400 truncate">{siteName ?? displayHost}</span>
        </div>
      </div>

      {image && (
        <div className="relative shrink-0 w-28 sm:w-36">
          <Image src={image} alt={title} fill className="object-cover my-0" unoptimized />
        </div>
      )}
    </a>
  )
}
