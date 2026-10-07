import type { PageInfo } from '@/types/book';
import type { ReferencePageInfo } from '@/utils/progress';

/** Display labels only. Reading progress and PDF destinations stay physical. */
export function getCalibratedPDFPageInfo(
  pageInfo: PageInfo | undefined,
  offset: number | null | undefined,
): ReferencePageInfo | null {
  if (typeof offset !== 'number' || !Number.isSafeInteger(offset) || !pageInfo) return null;
  if (pageInfo.total <= 0 || pageInfo.current < 0) return null;
  return {
    current: String(pageInfo.current + 1 + offset),
    total: pageInfo.total + offset,
  };
}

/** Resolve a calibrated label to an exact zero-based PDF destination. */
export function getCalibratedPDFPageIndex(
  page: number,
  total: number,
  offset: number,
): number | null {
  const index = page - offset - 1;
  return Number.isSafeInteger(index) && index >= 0 && index < total ? index : null;
}
