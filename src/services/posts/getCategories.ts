import fs from 'fs';
import path from 'path';
import { CONTENT_DIR } from '@/constants/paths';

export async function getCategories(): Promise<string[]> {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  return fs
    .readdirSync(CONTENT_DIR)
    .filter((item) =>
      fs.statSync(path.join(CONTENT_DIR, item)).isDirectory()
    );
}
