import pg from "pg";
import dns from "node:dns";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Repo, RepoStatus } from "@archai/types";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool;

async function getConnectionString(): Promise<string> {
  let connectionString = process.env.DATABASE_URL ?? "";
  const q = connectionString.indexOf("?");
  if (q !== -1) {
    const params = connectionString.slice(q + 1).split("&").filter((p) => !p.startsWith("sslmode="));
    connectionString = connectionString.slice(0, q) + (params.length ? "?" + params.join("&") : "");
  }
  try {
    const url = new URL(connectionString.replace(/^postgresql:/i, "postgres:"));
    const hostname = url.hostname;
    if (hostname && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      const ip = await dns.promises.lookup(hostname, { family: 4 });
      url.hostname = ip.address;
      connectionString = url.toString().replace(/^postgres:\/\//i, "postgresql://");
    }
  } catch {
    // keep original URL if parse/resolve fails
  }
  return connectionString;
}

export async function initDb(): Promise<void> {
  const connectionString = await getConnectionString();
  const useSupabaseOrSSL = connectionString.includes("supabase.co");
  pool = new pg.Pool({
    connectionString,
    ssl: useSupabaseOrSSL ? { rejectUnauthorized: false } : false,
  });
}

export async function runMigrations(): Promise<void> {
  const sql = await readFile(
    join(__dirname, "..", "migrations", "001_initial.sql"),
    "utf-8"
  );
  await pool.query(sql);
}

export interface RepoRow {
  id: string;
  github_url: string;
  name: string;
  default_branch: string;
  status: string;
  error_message: string | null;
  files_processed: number;
  created_at: Date;
  updated_at: Date;
}

function rowToRepo(r: RepoRow): Repo {
  return {
    id: r.id,
    github_url: r.github_url,
    name: r.name,
    default_branch: r.default_branch,
    status: r.status as RepoStatus,
    error_message: r.error_message,
    files_processed: Number(r.files_processed),
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

export async function createRepo(
  githubUrl: string,
  name: string,
  defaultBranch: string
): Promise<Repo> {
  const res = await pool.query<RepoRow>(
    `INSERT INTO repos (github_url, name, default_branch, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING *`,
    [githubUrl, name, defaultBranch]
  );
  return rowToRepo(res.rows[0]!);
}

export async function getRepo(id: string): Promise<Repo | null> {
  const res = await pool.query<RepoRow>("SELECT * FROM repos WHERE id = $1", [id]);
  return res.rows[0] ? rowToRepo(res.rows[0]) : null;
}

export async function setRepoStatus(
  id: string,
  status: RepoStatus,
  errorMessage?: string | null,
  filesProcessed?: number
): Promise<void> {
  const updates: string[] = ["status = $2", "updated_at = now()"];
  const values: unknown[] = [id, status];
  let i = 3;
  if (errorMessage !== undefined) {
    updates.push(`error_message = $${i++}`);
    values.push(errorMessage);
  }
  if (filesProcessed !== undefined) {
    updates.push(`files_processed = $${i++}`);
    values.push(filesProcessed);
  }
  await pool.query(
    `UPDATE repos SET ${updates.join(", ")} WHERE id = $1`,
    values
  );
}

export { pool };
