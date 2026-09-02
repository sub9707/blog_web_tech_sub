export const ROUTES = {
  HOME: '/',
  POST: (category: string, slug: string) => `/posts/${category}/${slug}`,
  PORTFOLIO: '/portfolio',
  PROJECT: (slug: string) => `/portfolio/${slug}`,
  ABOUT: '/about',
  ARCHIVE: '/archive',
  ARCHIVE_MONTH: (year: string, month: string) => `/archive/${year}/${month}`,
  SEARCH: '/search',
} as const;
