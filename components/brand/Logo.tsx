import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Props {
  /**
   * When true → renders the full wordmark (/logo.png) which already contains the
   *   word "تمكين" + diamond accent. Width auto-scales from the natural aspect ratio.
   * When false → renders just the diamond mark (/mark.png) as a square glyph.
   */
  withWordmark?: boolean;
  /** Wrap in a link to "/". */
  asLink?: boolean;
  /** Visual *height* of the logo in px. Width auto-scales for the wordmark. */
  size?: number;
  className?: string;
}

/**
 * Tamkeen brand mark.
 *
 * Two visuals share one component:
 *   - the wordmark (/logo.png) — wide aspect, includes the word "تمكين"
 *   - the diamond mark (/mark.png) — square glyph for tight spaces (e.g. footer, favicons)
 *
 * Both assets are theme-agnostic — colours come baked into the PNG.
 */
export function Logo({ withWordmark, asLink, size, className }: Props) {
  // Sensible defaults: wordmark is a comfortable header height; mark is a smaller glyph.
  const height = size ?? (withWordmark ? 44 : 32);
  // For the wordmark we pass a generous width upper bound to Next/Image and then
  // override with CSS so the natural aspect ratio is preserved at any height.
  const renderedWidth = withWordmark ? height * 4 : height;

  const content = (
    <span className={cn('inline-flex items-center', className)}>
      <Image
        src={withWordmark ? '/logo.png' : '/mark.png'}
        alt="تمكين"
        width={renderedWidth}
        height={height}
        priority
        className="select-none"
        style={
          withWordmark
            ? { height, width: 'auto' }
            : { height, width: height }
        }
      />
    </span>
  );

  if (asLink) {
    return (
      <Link href="/" aria-label="تمكين — الصفحة الرئيسية" className="inline-flex">
        {content}
      </Link>
    );
  }
  return content;
}
