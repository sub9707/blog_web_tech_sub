export interface NewsMeta {
  slug: string;
  title: string;
  date: string;
  period: string;
  description: string;
  tags: string[];
  sourceCount: number;
  thumbnail?: string;
  isDraft: boolean;
}

export interface News extends NewsMeta {
  content: string;
}
