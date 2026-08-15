// List/query model — shared by the Pagination/Filter components and the
// app's resource data providers. A list is a query → view window, NOT
// "load everything": $/<ns>/query drives $/<ns>/view (ids + total). Server
// capabilities are declared per-resource (ResourceApi); unsupported bits are
// applied client-side, so flipping a resource to server-paged later is a
// provider-internal change with no UI impact.

export type WhereOp = 'eq' | 'ne' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface WhereClause {
  field: string;
  op: WhereOp;
  value: unknown;
}

export interface Query {
  q?: string;
  where?: WhereClause[];
  page: number;
  pageSize: number;
  sort?: { field: string; dir: 'asc' | 'desc' };
}

// The current windowed result: which entity ids to show, the grand total
// (from $/summary or the server), and load state.
export interface ListView {
  ids: string[];
  total: number;
  loading: boolean;
  error?: string;
}

// A resource declares the shape of its list API. `false` = the server does not
// support that capability, so it's applied client-side over the loaded set.
export interface ResourceApi {
  list: string; // '/api/users'
  one?: (id: string) => string; // id → '/api/users/<id>'
  pagination?: 'offset' | 'page' | false;
  search?: 'q' | false;
  filter?: 'where' | false;
  sort?: boolean;
  // How to read the list payload: a bare array, or a wrapper with items+total.
  response?: 'array' | { items: string; total: string };
}
