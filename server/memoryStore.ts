import type { PhotoStore, Store } from './blob.js'

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

/** An in-memory PhotoStore, for tests. */
export function memoryPhotoStore(): PhotoStore & { files: Map<string, { body: ArrayBuffer; type: string }> } {
  const files = new Map<string, { body: ArrayBuffer; type: string }>()
  return {
    files,
    read: async p => files.get(p) ?? null,
    write: async (p, body, type) => void files.set(p, { body, type }),
    remove: async p => void files.delete(p),
    usage: async prefix => {
      const hits = [...files].filter(([p]) => p.startsWith(prefix))
      return { count: hits.length, bytes: hits.reduce((s, [, f]) => s + f.body.byteLength, 0) }
    },
  }
}
