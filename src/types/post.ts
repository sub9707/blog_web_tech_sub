export interface PostMeta {
  slug: string;
  category: string;
  title: string;
  date: string;
  description: string;
  thumbnail?: string;
  tags: string[];
  readTime: number;
}

export interface Post extends PostMeta {
  content: string;
}
