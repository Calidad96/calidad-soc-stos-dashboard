const API_URL = 'https://api.monday.com/v2';

export async function mondayQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN not configured');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
      'API-Version': '2024-10',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 300 },
  });

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join('; '));
  }
  return json.data as T;
}

interface MondayColumnValue {
  column?: { title?: string };
  text?: string;
}

interface MondayItem {
  id: string;
  name: string;
  column_values?: MondayColumnValue[];
}

function colText(item: MondayItem, title: string): string {
  const cv = item.column_values?.find((c) => c.column?.title === title);
  return cv?.text?.trim() ?? '';
}

const NUMERIC_FIELDS = new Set([
  'Actual Value',
  'Target',
  'KPI Score',
  'Monthly Bill',
  'Setup Fee',
  'Hours Per Shift',
  'Shifts Per Week',
  'Pay Rate',
  'Bill Rate',
  'Items Written',
]);

export function parseItem(item: MondayItem): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = { _name: item.name };
  for (const cv of item.column_values ?? []) {
    const title = cv.column?.title;
    if (!title) continue;
    const text = cv.text?.trim() ?? '';
    if (!text) {
      fields[title] = null;
      continue;
    }
    if (NUMERIC_FIELDS.has(title) && /^-?\d+(\.\d+)?$/.test(text)) {
      fields[title] = parseFloat(text);
    } else {
      fields[title] = text;
    }
  }
  return fields;
}

interface ItemsPage {
  cursor: string | null;
  items: MondayItem[];
}

async function fetchFirstPage(boardId: string): Promise<ItemsPage | undefined> {
  const result = await mondayQuery<{ boards: { items_page: ItemsPage }[] }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          cursor
          items { id name column_values { text column { title } } }
        }
      }
    }`,
    { boardId: [boardId] }
  );
  return result.boards?.[0]?.items_page;
}

async function fetchNextPage(cursor: string): Promise<ItemsPage | undefined> {
  const result = await mondayQuery<{ next_items_page: ItemsPage }>(
    `query ($cursor: String!) {
      next_items_page(limit: 500, cursor: $cursor) {
        cursor
        items { id name column_values { text column { title } } }
      }
    }`,
    { cursor }
  );
  return result.next_items_page;
}

export async function fetchBoardItems(boardId: string): Promise<MondayItem[]> {
  const items: MondayItem[] = [];
  let page = await fetchFirstPage(boardId);
  while (page) {
    items.push(...page.items);
    if (!page.cursor) break;
    page = await fetchNextPage(page.cursor);
  }
  return items;
}

export { colText };
