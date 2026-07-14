import type { MondayItem } from './sync-utils';

const API_URL = 'https://api.monday.com/v2';

async function mondayQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {},
  retries = 3
): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN not configured');

  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
          'API-Version': '2024-10',
        },
        body: JSON.stringify({ query, variables }),
      });

      const json = await res.json();
      if (json.errors?.length) {
        const msg = json.errors.map((e: { message: string }) => e.message).join('; ');
        throw new Error(`Monday API error: ${msg}`);
      }
      return json.data as T;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}

interface ItemsPage {
  cursor: string | null;
  items: MondayItem[];
}

export async function getAllBoardItems(boardId: string): Promise<MondayItem[]> {
  const items: MondayItem[] = [];

  const first = await mondayQuery<{ boards: { items_page: ItemsPage }[] }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          cursor
          items {
            id name
            column_values { id text value type column { title type } }
          }
        }
      }
    }`,
    { boardId: [String(boardId)] }
  );

  let cursor: string | null = first.boards?.[0]?.items_page?.cursor ?? null;
  items.push(...(first.boards?.[0]?.items_page?.items ?? []));

  while (cursor) {
    const nextPage = await mondayQuery<{ next_items_page: ItemsPage }>(
      `query ($cursor: String!) {
        next_items_page(limit: 500, cursor: $cursor) {
          cursor
          items {
            id name
            column_values { id text value type column { title type } }
          }
        }
      }`,
      { cursor }
    );
    const page: ItemsPage = nextPage.next_items_page;
    items.push(...(page.items ?? []));
    cursor = page.cursor;
  }

  return items;
}

export async function createItem(
  boardId: string,
  itemName: string,
  columnValues: Record<string, unknown> = {}
): Promise<{ id: string; name: string }> {
  const data = await mondayQuery<{
    create_item: { id: string; name: string };
  }>(
    `mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id name
      }
    }`,
    {
      boardId: String(boardId),
      itemName,
      columnValues: JSON.stringify(columnValues),
    }
  );
  return data.create_item;
}

export async function deleteItem(itemId: string): Promise<void> {
  await mondayQuery(
    `mutation ($itemId: ID!) { delete_item(item_id: $itemId) { id } }`,
    { itemId: String(itemId) }
  );
}

export async function getBoardItemIds(boardId: string): Promise<string[]> {
  const items = await getAllBoardItems(boardId);
  return items.map((i) => i.id);
}

/** Lightweight ID-only fetch — much faster than loading all column values. */
export async function getBoardItemIdsLight(boardId: string): Promise<string[]> {
  const ids: string[] = [];

  const first = await mondayQuery<{ boards: { items_page: ItemsPage }[] }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          cursor
          items { id }
        }
      }
    }`,
    { boardId: [String(boardId)] }
  );

  let cursor: string | null = first.boards?.[0]?.items_page?.cursor ?? null;
  for (const item of first.boards?.[0]?.items_page?.items ?? []) {
    ids.push(item.id);
  }

  while (cursor) {
    const nextPage = await mondayQuery<{ next_items_page: ItemsPage }>(
      `query ($cursor: String!) {
        next_items_page(limit: 500, cursor: $cursor) {
          cursor
          items { id }
        }
      }`,
      { cursor }
    );
    const page: ItemsPage = nextPage.next_items_page;
    for (const item of page.items ?? []) {
      ids.push(item.id);
    }
    cursor = page.cursor;
  }

  return ids;
}

export async function updateItemColumns(
  boardId: string,
  itemId: string,
  columnValues: Record<string, unknown>
): Promise<void> {
  await mondayQuery(
    `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $columnValues
      ) { id }
    }`,
    {
      boardId: String(boardId),
      itemId: String(itemId),
      columnValues: JSON.stringify(columnValues),
    }
  );
}

export async function deleteItemsById(itemIds: string[]): Promise<number> {
  let deleted = 0;
  for (const id of itemIds) {
    await deleteItem(id);
    deleted++;
    if (deleted % 5 === 0) await new Promise((r) => setTimeout(r, 40));
  }
  return deleted;
}

export async function deleteBoardItems(boardId: string): Promise<number> {
  const ids = await getBoardItemIds(boardId);
  return deleteItemsById(ids);
}
