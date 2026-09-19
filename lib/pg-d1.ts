import postgres from 'postgres';
import {migrations} from '@/migrations';

// 以 PostgreSQL（Supabase）模擬原本 Cloudflare D1 的 prepare/bind/first/all/run/batch 介面，
// 讓既有路由的 SQL 呼叫方式不需改寫。所有資料表放在獨立的 `bubu` schema。
export const SCHEMA = 'bubu';
const TABLES = ['audit_log','inquiries','case_studies','payments','quotes','media_assets','media_blobs','site_photos','catalog_items','content_posts','dispatch_outbox','staff','customer_reviews'];
const tablePattern = new RegExp(`(?<![\\w.])(${TABLES.join('|')})(?![\\w])`, 'g');

type Value = string | number | boolean | null | Uint8Array;
type Meta = {changes: number};
export type D1Result<T = Record<string, unknown>> = {results: T[]; success: true; meta: Meta};

/** 轉換 SQLite 語法：`?` → `$n`、表名加上 schema、`changes()` 以前一句的影響筆數代入。 */
export function translate(sql: string, previousChanges = 0): string {
  let n = 0;
  return sql.split(/('(?:[^']|'')*')/).map((part, i) => {
    if (i % 2) return part; // 字串常值保持原樣
    return part
      .replace(/\bchanges\(\)/g, String(previousChanges))
      .replace(tablePattern, `${SCHEMA}.$1`)
      .replace(/\?/g, () => '$' + (++n));
  }).join('');
}

let client: ReturnType<typeof postgres> | null = null;
let ready: Promise<void> | null = null;

function sql() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_UNAVAILABLE');
    client = postgres(url, {
      prepare: false, // Supabase 交易模式連線池不支援 prepared statements
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      transform: {undefined: null},
      types: {
        bigint: {to: 20, from: [20, 1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x)},
      },
      onnotice: () => {},
    });
  }
  return client;
}

async function ensureSchema() {
  ready ??= (async () => {
    const db = sql();
    await db.begin(async tx => {
      await tx.unsafe('SELECT pg_advisory_xact_lock(724119)');
      await tx.unsafe(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
      const done = new Set((await tx.unsafe(`SELECT version FROM ${SCHEMA}.schema_migrations`)).map(r => r.version as string));
      for (const m of migrations) {
        if (done.has(m.version)) continue;
        await tx.unsafe(m.sql);
        await tx.unsafe(`INSERT INTO ${SCHEMA}.schema_migrations(version) VALUES ($1)`, [m.version]);
      }
    });
  })().catch(e => {ready = null; throw e;});
  return ready;
}

type Executor = {unsafe: (q: string, p?: never[]) => Promise<Record<string, unknown>[] & {count: number}>};

class Statement {
  constructor(readonly query: string, readonly values: Value[] = []) {}
  // D1 會把 boolean 存成 1/0，這裡維持相同行為
  bind(...values: Value[]) {return new Statement(this.query, values.map(v => typeof v === 'boolean' ? +v : v));}
  async exec(executor?: Executor, previousChanges = 0): Promise<D1Result> {
    await ensureSchema();
    const run = (executor ?? sql()) as unknown as Executor;
    const rows = await run.unsafe(translate(this.query, previousChanges), this.values as never[]);
    return {results: [...rows], success: true, meta: {changes: rows.count ?? 0}};
  }
  async all<T = Record<string, unknown>>() {return (await this.exec()) as D1Result<T>;}
  async run() {return this.exec();}
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = (await this.exec()).results[0];
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }
}

export const database = {
  prepare: (query: string) => new Statement(query),
  async batch(statements: Statement[]): Promise<D1Result[]> {
    await ensureSchema();
    return sql().begin(async tx => {
      const out: D1Result[] = [];
      let previous = 0;
      for (const s of statements) {
        const r = await s.exec(tx as unknown as Executor, previous);
        if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(s.query)) previous = r.meta.changes;
        out.push(r);
      }
      return out;
    }) as Promise<D1Result[]>;
  },
};
export type Database = typeof database;
