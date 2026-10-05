'use client';

import Link from 'next/link';
import { MOBILE_MEDIA_QUERY } from '@/constants/ui';

type Props = React.ComponentProps<typeof Link> & { href: string };

// 모바일은 인터셉트 라우트(모달)를 우회해 상세 페이지로 하드 내비게이션
export default function ProjectLink({ href, onClick, ...props }: Props) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
    event.preventDefault();
    window.location.assign(href);
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
