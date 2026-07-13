const API_URL = 'https://api.monday.com/v2';

export async function mondayQuery(query, variables = {}, retries = 3) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new Error('MONDAY_API_TOKEN not configured');

  let lastErr;
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
        const msg = json.errors.map((e) => e.message).join('; ');
        throw new Error(`Monday API error: ${msg}`);
      }
      return json.data;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}

export async function getBoardStructure(boardId) {
  const query = `
    query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        id
        name
        description
        workspace_id
        columns { id title type settings_str }
        groups { id title }
      }
    }
  `;
  const data = await mondayQuery(query, { boardId: [String(boardId)] });
  return data.boards?.[0] ?? null;
}

export async function getBoardItems(boardId, limit = 100) {
  const query = `
    query ($boardId: [ID!], $limit: Int!) {
      boards(ids: $boardId) {
        id
        name
        items_page(limit: $limit) {
          cursor
          items {
            id
            name
            group { id title }
            created_at
            updated_at
            column_values { id text value type column { title type } }
          }
        }
      }
    }
  `;
  const data = await mondayQuery(query, {
    boardId: [String(boardId)],
    limit,
  });
  return data.boards?.[0] ?? null;
}

export async function getAllBoardItems(boardId) {
  const items = [];
  let cursor = null;

  do {
    const query = cursor
      ? `
        query ($cursor: String!) {
          next_items_page(limit: 500, cursor: $cursor) {
            cursor
            items {
              id name
              group { id title }
              created_at updated_at
              column_values { id text value type column { title type } }
            }
          }
        }
      `
      : `
        query ($boardId: [ID!]) {
          boards(ids: $boardId) {
            items_page(limit: 500) {
              cursor
              items {
                id name
                group { id title }
                created_at updated_at
                column_values { id text value type column { title type } }
              }
            }
          }
        }
      `;

    const data = await mondayQuery(
      query,
      cursor ? { cursor } : { boardId: [String(boardId)] }
    );

    const page = cursor ? data.next_items_page : data.boards?.[0]?.items_page;
    if (!page) break;
    items.push(...(page.items ?? []));
    cursor = page.cursor;
  } while (cursor);

  return items;
}

export async function createBoard(name, workspaceId, description = '') {
  const query = `
    mutation ($name: String!, $workspaceId: ID!, $description: String) {
      create_board(
        board_name: $name
        board_kind: public
        workspace_id: $workspaceId
        description: $description
      ) { id name }
    }
  `;
  const data = await mondayQuery(query, {
    name,
    workspaceId: String(workspaceId),
    description,
  });
  return data.create_board;
}

export async function createColumn(boardId, title, columnType, defaults = {}) {
  const query = `
    mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!, $defaults: JSON) {
      create_column(board_id: $boardId, title: $title, column_type: $columnType, defaults: $defaults) {
        id title type
      }
    }
  `;
  const data = await mondayQuery(query, {
    boardId: String(boardId),
    title,
    columnType,
    defaults: JSON.stringify(defaults),
  });
  return data.create_column;
}

export async function createItem(boardId, itemName, columnValues = {}) {
  const query = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON) {
      create_item(board_id: $boardId, item_name: $itemName, column_values: $columnValues) {
        id name
      }
    }
  `;
  const data = await mondayQuery(query, {
    boardId: String(boardId),
    itemName,
    columnValues: JSON.stringify(columnValues),
  });
  return data.create_item;
}

export async function getWorkspaceBoards(workspaceId) {
  const query = `
    query ($workspaceId: [ID!]) {
      boards(workspace_ids: $workspaceId, limit: 100) {
        id name description
      }
    }
  `;
  const data = await mondayQuery(query, {
    workspaceId: [String(workspaceId)],
  });
  return data.boards ?? [];
}
