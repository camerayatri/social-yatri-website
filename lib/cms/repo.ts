import "server-only";
import { audit, type Actor } from "./audit";
import { sql, withTransaction } from "./db";
import { DEFAULTS } from "./defaults";
import { CONTENT_KEYS, SCHEMAS, issuesToFieldErrors, type ContentDocs, type ContentKey, type FieldErrors } from "./schema";

/**
 * Reading and writing content documents.
 *
 * Every document is one row in `content_docs`, versioned for optimistic
 * locking: an editor loads a document with its version, and a save names that
 * version back. If someone else saved in between, the versions disagree and the
 * save is refused as a conflict instead of quietly overwriting their work.
 *
 * Each save copies the row it replaces into `content_revisions` (the newest
 * twenty per key are kept) and writes an audit entry, all in one transaction.
 * Restoring a revision is just another save, so it is itself undoable.
 *
 * These functions trust their input: the actions validate with the schemas
 * before calling them, and authorize the caller.
 */

/** How many superseded copies of each document are kept. */
export const REVISIONS_KEPT = 20;

export type DocState<K extends ContentKey = ContentKey> = {
  key: K;
  data: ContentDocs[K];
  /** 0 when the document has never been saved and `data` is the shipped default. */
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  /** True when no row exists, or the stored row no longer passes its schema. */
  fromDefaults: boolean;
  /** Why a stored row was set aside in favour of the default. */
  invalid?: FieldErrors;
};

type DocRow = { key: string; data: unknown; version: number; updated_at: Date | null; updated_by_email: string | null };

function toState<K extends ContentKey>(key: K, row: DocRow | undefined): DocState<K> {
  if (!row) return { key, data: DEFAULTS[key], version: 0, updatedAt: null, updatedBy: null, fromDefaults: true };
  const parsed = SCHEMAS[key].safeParse(row.data);
  return {
    key,
    data: (parsed.success ? parsed.data : DEFAULTS[key]) as ContentDocs[K],
    version: row.version,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    updatedBy: row.updated_by_email,
    fromDefaults: !parsed.success,
    invalid: parsed.success ? undefined : issuesToFieldErrors(parsed.error.issues),
  };
}

const SELECT_DOCS = `SELECT d.key, d.data, d.version, d.updated_at, m.email AS updated_by_email
                       FROM content_docs d LEFT JOIN maintainers m ON m.id = d.updated_by`;

/** Every document, uncached, with its version. Missing or invalid rows come back as defaults. */
export async function getDocs(): Promise<{ [K in ContentKey]: DocState<K> }> {
  const rows = (await sql().query(SELECT_DOCS)) as DocRow[];
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Object.fromEntries(CONTENT_KEYS.map((key) => [key, toState(key, byKey.get(key))])) as {
    [K in ContentKey]: DocState<K>;
  };
}

/** One document, uncached, with its version. */
export async function getDoc<K extends ContentKey>(key: K): Promise<DocState<K>> {
  const rows = (await sql().query(`${SELECT_DOCS} WHERE d.key = $1`, [key])) as DocRow[];
  return toState(key, rows[0]);
}

/** Just the data of every document, for cross-document validation. */
export async function getAllData(): Promise<ContentDocs> {
  const docs = await getDocs();
  return Object.fromEntries(CONTENT_KEYS.map((k) => [k, docs[k].data])) as ContentDocs;
}

export type SaveResult = { ok: true; version: number } | { conflict: true; version: number };

/**
 * Writes `data` as the new `key` document if the stored version is still
 * `expectedVersion` (0 for a document never saved). Returns the new version,
 * or the version that is there now when someone saved first.
 */
export async function saveDoc<K extends ContentKey>(
  key: K,
  data: ContentDocs[K],
  expectedVersion: number,
  actor: Actor,
  auditAction = "content.save",
  auditDetail?: Record<string, unknown>,
): Promise<SaveResult> {
  return withTransaction(async (tx) => {
    const json = JSON.stringify(data);
    const current = await tx.query<{ data: unknown; version: number }>(
      `SELECT data, version FROM content_docs WHERE key = $1 FOR UPDATE`,
      [key],
    );
    const row = current.rows[0];
    let version: number;

    if (!row) {
      if (expectedVersion !== 0) return { conflict: true as const, version: 0 };
      // Two first saves racing: the loser's insert does nothing and is a conflict.
      const inserted = await tx.query<{ version: number }>(
        `INSERT INTO content_docs (key, data, version, updated_at, updated_by)
         VALUES ($1, $2::jsonb, 1, now(), $3) ON CONFLICT (key) DO NOTHING RETURNING version`,
        [key, json, actor?.id ?? null],
      );
      if (!inserted.rows[0]) return { conflict: true as const, version: 1 };
      version = 1;
    } else {
      if (row.version !== expectedVersion) return { conflict: true as const, version: row.version };
      await tx.query(
        `INSERT INTO content_revisions (key, version, data, created_by) VALUES ($1, $2, $3::jsonb, $4)`,
        [key, row.version, JSON.stringify(row.data), actor?.id ?? null],
      );
      const updated = await tx.query<{ version: number }>(
        `UPDATE content_docs SET data = $2::jsonb, version = version + 1, updated_at = now(), updated_by = $3
          WHERE key = $1 RETURNING version`,
        [key, json, actor?.id ?? null],
      );
      version = updated.rows[0].version;
      await tx.query(
        `DELETE FROM content_revisions WHERE key = $1 AND id NOT IN (
           SELECT id FROM content_revisions WHERE key = $1 ORDER BY id DESC LIMIT $2)`,
        [key, REVISIONS_KEPT],
      );
    }

    await audit(actor, auditAction, key, { version, ...auditDetail }, tx);
    return { ok: true as const, version };
  });
}

export type RevisionSummary = { id: number; version: number; createdAt: string; createdBy: string | null };

/** The kept revisions of `key`, newest first, without their data. */
export async function listRevisions(key: ContentKey): Promise<RevisionSummary[]> {
  const rows = (await sql().query(
    `SELECT r.id, r.version, r.created_at, m.email
       FROM content_revisions r LEFT JOIN maintainers m ON m.id = r.created_by
      WHERE r.key = $1 ORDER BY r.id DESC LIMIT $2`,
    [key, REVISIONS_KEPT],
  )) as { id: string; version: number; created_at: Date; email: string | null }[];
  return rows.map((r) => ({
    id: Number(r.id),
    version: r.version,
    createdAt: new Date(r.created_at).toISOString(),
    createdBy: r.email,
  }));
}

/** One revision's stored data, or null. */
export async function getRevisionData(key: ContentKey, id: number): Promise<{ version: number; data: unknown } | null> {
  const rows = (await sql().query(`SELECT version, data FROM content_revisions WHERE key = $1 AND id = $2`, [
    key,
    id,
  ])) as { version: number; data: unknown }[];
  return rows[0] ?? null;
}

export type RestoreResult =
  | SaveResult
  | { missing: true }
  | { fieldErrors: FieldErrors };

/**
 * Puts revision `id` back as the current `key` document, as a new save on top
 * of `expectedVersion`. The revision must still pass today's schema; one from
 * before a schema change that no longer fits is refused with its errors.
 */
export async function restoreRevision<K extends ContentKey>(
  key: K,
  id: number,
  expectedVersion: number,
  actor: Actor,
): Promise<RestoreResult> {
  const revision = await getRevisionData(key, id);
  if (!revision) return { missing: true };
  const parsed = SCHEMAS[key].safeParse(revision.data);
  if (!parsed.success) return { fieldErrors: issuesToFieldErrors(parsed.error.issues) };
  return saveDoc(key, parsed.data as ContentDocs[K], expectedVersion, actor, "content.restore", {
    fromRevision: id,
    fromVersion: revision.version,
  });
}
