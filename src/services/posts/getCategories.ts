import fs from 'fs';
import path from 'path';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'posting');

export async function getCategories(): Promise<string[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((item) =>
      fs.statSync(path.join(CONTENT_DIR, item)).isDirectory()
    );
}
