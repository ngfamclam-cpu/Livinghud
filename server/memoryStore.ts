import type { Store } from './blob'

/** An in-memory Store with version tags, for tests. */
export function memoryStore(): Store & { files: Map<string, { body: string; etag: string }> } {
  const files = new Map<string, { body: string; etag: string }>()
  let version = 0
  return {
    files,
    read: async p => files.get(p) ?? null,
    write: async (p, body) => void files.set(p, { body, etag: `v${++version}` }),
    writeIf: async (p, body, etag) => {
      const current = files.get(p)
      if ((current?.etag ?? null) !== etag) return false
      files.set(p, { body, etag: `v${++version}` })
      return true
    },
  }
}
