import { PostMeta } from '@/types/post';
import { getPosts } from '@/services/posts/getPosts';

export async function getRelatedPosts(titles: string[]): Promise<PostMeta[]> {
  if (titles.length === 0) return [];

  const posts = await getPosts();
  const postsByTitle = new Map(posts.map((post) => [post.title, post]));

  return titles
    .map((title) => postsByTitle.get(title))
    .filter((post): post is PostMeta => post !== undefined);
}
