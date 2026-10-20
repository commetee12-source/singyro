import { openDB, type DBSchema } from "idb";
import { categories } from "./data";
import type { Manual } from "./types";

const MAX_FILE = 20 * 1024 * 1024;
const MAX_LIBRARY = 100 * 1024 * 1024;
const allowed = /\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|txt|md)$/i;
interface LibraryDB extends DBSchema {
  manuals: { key: string; value: Manual };
}
const database = () =>
  openDB<LibraryDB>("singyro-library", 1, {
    upgrade(db) {
      db.createObjectStore("manuals", { keyPath: "id" });
    },
  });

export function safeUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (/^\/manuals\/[a-zA-Z0-9_%가-힣. ()-]+$/.test(value))
    return !value.includes("..") && !/%2f|%5c|%2e/i.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateManual(value: unknown): Manual {
  if (!value || typeof value !== "object")
    throw new Error("자료 형식을 확인해 주세요.");
  const m = value as Record<string, unknown>;
  for (const key of [
    "id",
    "title",
    "description",
    "publisher",
    "year",
    "addedAt",
    "category",
  ]) {
    if (typeof m[key] !== "string" || (m[key] as string).length > 2000)
      throw new Error("자료 정보 형식이 올바르지 않습니다.");
  }
  if (
    !(m.title as string).trim() ||
    !(m.id as string).trim() ||
    !categories.some((c) => c.id === m.category)
  )
    throw new Error("제목 또는 업무 분야를 확인해 주세요.");
  if (m.url !== undefined && !safeUrl(m.url))
    throw new Error("안전한 HTTPS 자료 주소를 입력해 주세요.");
  if (
    m.filename !== undefined &&
    (typeof m.filename !== "string" ||
      !allowed.test(m.filename) ||
      m.filename.length > 250)
  )
    throw new Error("지원하지 않는 파일 형식입니다.");
  return {
    id: m.id as string,
    title: m.title as string,
    category: m.category as Manual["category"],
    description: m.description as string,
    publisher: m.publisher as string,
    year: m.year as string,
    addedAt: m.addedAt as string,
    ...(m.url ? { url: m.url as string } : {}),
    ...(m.filename ? { filename: m.filename as string } : {}),
    ...(m.kind === "law" || m.kind === "resource" ? { kind: m.kind } : {}),
  };
}

export async function getManuals() {
  return (await database()).getAll("manuals");
}
export async function saveManual(manual: Manual) {
  validateManual(manual);
  if (!manual.url && !manual.file)
    throw new Error("파일 또는 원문 주소가 필요합니다.");
  if (
    manual.file &&
    (!manual.filename ||
      !allowed.test(manual.filename) ||
      manual.file.size > MAX_FILE)
  )
    throw new Error("파일은 지원되는 문서 형식, 20MB 이하로 등록해 주세요.");
  const db = await database();
  const tx = db.transaction("manuals", "readwrite");
  const all = await tx.store.getAll();
  const total =
    all
      .filter((m) => m.id !== manual.id)
      .reduce((sum, m) => sum + (m.file?.size ?? 0), 0) +
    (manual.file?.size ?? 0);
  if (total > MAX_LIBRARY) {
    tx.abort();
    await tx.done.catch(() => {});
    throw new Error(
      "자료실 파일 용량이 100MB를 넘습니다. 자료를 백업한 뒤 정리해 주세요.",
    );
  }
  await tx.store.put(manual);
  await tx.done;
}
export async function removeManual(id: string) {
  await (await database()).delete("manuals", id);
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function exportManuals() {
  const manuals = await getManuals();
  const serialized = await Promise.all(
    manuals.map(async ({ file, builtin: _builtin, ...m }) => {
      if (!file) return m;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 8192)
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return { ...m, fileBase64: btoa(binary) };
    }),
  );
  downloadBlob(
    new Blob(
      [
        JSON.stringify({
          format: "singyro-manuals",
          version: 1,
          manuals: serialized,
        }),
      ],
      { type: "application/json" },
    ),
    `신규는여기로-자료백업-${new Date().toISOString().slice(0, 10)}.json`,
  );
}
export async function importManuals(file: File): Promise<number> {
  if (file.size > 145 * 1024 * 1024)
    throw new Error(
      "백업 파일이 너무 큽니다. 145MB 이하 파일을 선택해 주세요.",
    );
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("읽을 수 없는 백업입니다. JSON 백업 파일을 선택해 주세요.");
  }
  const root = data as {
    format?: string;
    version?: number;
    manuals?: unknown[];
  } | null;
  if (
    !root ||
    root.format !== "singyro-manuals" ||
    root.version !== 1 ||
    !Array.isArray(root.manuals) ||
    root.manuals.length > 500
  )
    throw new Error("신규는 여기로에서 내보낸 자료 백업을 선택해 주세요.");
  let total = 0;
  const imported = root.manuals.map((value) => {
    const m = validateManual(value);
    const encoded = (value as Record<string, unknown>).fileBase64;
    if (encoded !== undefined) {
      if (
        typeof encoded !== "string" ||
        encoded.length > Math.ceil(MAX_FILE / 3) * 4 ||
        encoded.length % 4 !== 0 ||
        /[^A-Za-z0-9+/=]/.test(encoded) ||
        !m.filename
      )
        throw new Error("백업의 첨부파일이 올바르지 않습니다.");
      const raw = atob(encoded);
      total += raw.length;
      if (raw.length > MAX_FILE || total > MAX_LIBRARY)
        throw new Error("첨부파일 용량 제한을 초과한 백업입니다.");
      m.file = new Blob([Uint8Array.from(raw, (c) => c.charCodeAt(0))], {
        type: "application/octet-stream",
      });
    }
    if (!m.file && !m.url)
      throw new Error("파일 또는 원문 주소가 없는 자료가 있습니다.");
    return m;
  });
  const db = await database();
  const tx = db.transaction("manuals", "readwrite");
  const existing = await tx.store.getAll();
  const ids = new Set(existing.map((m) => m.id));
  let size = existing.reduce((sum, m) => sum + (m.file?.size ?? 0), 0);
  let count = 0;
  for (const m of imported) {
    if (ids.has(m.id)) continue;
    size += m.file?.size ?? 0;
    if (size > MAX_LIBRARY) {
      tx.abort();
      await tx.done.catch(() => {});
      throw new Error("복원 후 자료실 용량이 100MB를 넘습니다.");
    }
    ids.add(m.id);
    await tx.store.put(m);
    count++;
  }
  await tx.done;
  return count;
}
