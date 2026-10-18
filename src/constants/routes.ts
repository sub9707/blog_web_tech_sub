export const ROUTES = {
  HOME: '/',
  POST: (category: string, slug: string) => `/posts/${category}/${slug}`,
  PORTFOLIO: '/portfolio',
  PROJECT: (slug: string) => `/portfolio/${slug}`,
  ABOUT: '/about',
  ARCHIVE: '/archive',
  ARCHIVE_MONTH: (year: string, month: string) => `/archive/${year}/${month}`,
  SEARCH: '/search',
  NEWS: '/news',
  NEWS_DETAIL: (slug: string) => `/news/${slug}`,
  NEWS_THUMBNAIL: (slug: string) => `/news/${slug}/opengraph-image`,
} as const;
