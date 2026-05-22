export const ROUTES = {
  HOME: '/',
  POST: (category: string, slug: string) => `/posts/${category}/${slug}`,
} as const;
