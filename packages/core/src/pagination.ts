import { z } from "zod";

export const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    cursor: string | null;
    hasMore: boolean;
  };
  meta: {
    requestId: string;
    durationMs: number;
  };
};

/**
 * Build a cursor-paginated response from a full dataset.
 * The cursor is the `id` of the last item returned.
 *
 * @param items - full array already sorted in desired order
 * @param query - { cursor?, limit }
 * @param getId - extract the id from an item (default: item.id)
 * @param requestId - unique identifier for the request
 */
export function paginate<T extends { id: string }>(
  items: T[],
  query: PaginationQuery,
  startTime: number,
  requestId: string,
): PaginatedResponse<T> {
  const total = items.length;
  let startIndex = 0;

  if (query.cursor) {
    const cursorIndex = items.findIndex((item) => item.id === query.cursor);
    startIndex = cursorIndex === -1 ? 0 : cursorIndex + 1;
  }

  const page = items.slice(startIndex, startIndex + query.limit);
  const hasMore = startIndex + query.limit < total;
  const lastItem = page[page.length - 1];

  return {
    data: page,
    pagination: {
      total,
      limit: query.limit,
      cursor: hasMore && lastItem ? lastItem.id : null,
      hasMore,
    },
    meta: {
      requestId,
      durationMs: Date.now() - startTime,
    },
  };
}

/**
 * Build Prisma cursor-based pagination args.
 * Returns { skip, take, cursor } for use with prisma.findMany().
 */
export function prismaCursorArgs(query: PaginationQuery) {
  if (query.cursor) {
    return {
      skip: 1,
      take: query.limit,
      cursor: { id: query.cursor },
    };
  }

  return {
    take: query.limit,
  };
}
