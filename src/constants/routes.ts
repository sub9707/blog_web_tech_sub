export const ROUTES = {
  HOME: '/',
  POST: (category: string, slug: string) => `/posts/${category}/${slug}`,
  ABOUT: '/about',
  ARCHIVE: '/archive',
  SEARCH: '/search',
} as const;
