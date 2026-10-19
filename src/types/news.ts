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

export interface GlossaryImage {
  url: string;
  alt: string;
  sourceUrl?: string;
}

export interface GlossaryEntry {
  id: string;
  term: string;
  description: string;
  image?: GlossaryImage;
}

export interface News extends NewsMeta {
  content: string;
  glossary: GlossaryEntry[];
}
