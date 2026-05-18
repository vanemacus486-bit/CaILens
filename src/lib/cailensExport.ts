import { db } from '@/data/db'

/* ---------- types ---------- */

export interface CailensSnapshot {
  version: 1
  exportedAt: string
  data: {
    events: unknown[]
    categories: unknown[]
    settings: unknown[]
    weeklyEstimates: unknown[]
    conversations: unknown[]
    chatMessages: unknown[]
    pinnedAnalyses: unknown[]
    messageFeedback: unknown[]
  }
}

/* ---------- collect ---------- */

export async function collectSnapshot(): Promise<CailensSnapshot> {
  const [
    events,
    categories,
    settingsArr,
    weeklyEstimates,
    conversations,
    chatMessages,
    pinnedAnalyses,
    messageFeedback,
  ] = await Promise.all([
    db.events.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
    db.weeklyEstimates.toArray(),
    db.conversations.toArray(),
    db.chatMessages.toArray(),
    db.pinnedAnalyses.toArray(),
    db.messageFeedback.toArray(),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      events,
      categories,
      settings: settingsArr,
      weeklyEstimates,
      conversations,
      chatMessages,
      pinnedAnalyses,
      messageFeedback,
    },
  }
}

/* ---------- compress / decompress (gzip via CompressionStream) ---------- */

export async function compressData(input: string): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(bytes as unknown as BufferSource)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value as Uint8Array)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

export async function decompressData(compressed: Uint8Array): Promise<string> {
  const cs = new DecompressionStream('gzip')
  const writer = cs.writable.getWriter()
  writer.write(compressed as unknown as BufferSource)
  writer.close()
  const reader = cs.readable.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value as Uint8Array)
  }
  const total = chunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return new TextDecoder().decode(result)
}

/* ---------- encrypt / decrypt (age) ---------- */

export async function encryptWithPassphrase(data: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const { Encrypter } = await import('age-encryption')
  const enc = new Encrypter()
  enc.setPassphrase(passphrase)
  return enc.encrypt(data)
}

export async function decryptWithPassphrase(ciphertext: Uint8Array, passphrase: string): Promise<Uint8Array> {
  const { Decrypter } = await import('age-encryption')
  const dec = new Decrypter()
  dec.addPassphrase(passphrase)
  return dec.decrypt(ciphertext)
}

/* ---------- full export / import orchestration ---------- */

export async function exportCailens(passphrase: string): Promise<void> {
  const snapshot = await collectSnapshot()
  const json = JSON.stringify(snapshot)
  const compressed = await compressData(json)
  const armored = await encryptWithPassphrase(compressed, passphrase)

  const blob = new Blob([armored as BlobPart], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cailens-backup-${new Date().toISOString().slice(0, 10)}.cailens`
  a.click()
  URL.revokeObjectURL(url)
}

export interface CailensImportResult {
  tables: Record<string, number>
}

export async function importCailens(
  armoredText: string,
  passphrase: string,
): Promise<CailensImportResult> {
  const armoredBytes = new TextEncoder().encode(armoredText)
  const decrypted = await decryptWithPassphrase(armoredBytes, passphrase)
  const json = await decompressData(decrypted)
  const snapshot: CailensSnapshot = JSON.parse(json)

  if (snapshot.version !== 1) {
    throw new Error(`Unsupported snapshot version: ${snapshot.version}`)
  }

  const { data } = snapshot
  const tables: Record<string, number> = {}

  await db.transaction(
    'rw',
    [db.events, db.categories, db.settings, db.weeklyEstimates, db.conversations, db.chatMessages, db.pinnedAnalyses, db.messageFeedback] as unknown as Parameters<typeof db.transaction>[1],
    async () => {
      if (data.events.length > 0) {
        tables.events = data.events.length
        await db.events.clear()
        await db.events.bulkAdd(data.events as never[])
      }
      if (data.categories.length > 0) {
        tables.categories = data.categories.length
        await db.categories.clear()
        await db.categories.bulkAdd(data.categories as never[])
      }
      if (data.settings.length > 0) {
        tables.settings = data.settings.length
        await db.settings.clear()
        await db.settings.bulkAdd(data.settings as never[])
      }
      if (data.weeklyEstimates.length > 0) {
        tables.weeklyEstimates = data.weeklyEstimates.length
        await db.weeklyEstimates.clear()
        await db.weeklyEstimates.bulkAdd(data.weeklyEstimates as never[])
      }
      if (data.conversations.length > 0) {
        tables.conversations = data.conversations.length
        await db.conversations.clear()
        await db.conversations.bulkAdd(data.conversations as never[])
      }
      if (data.chatMessages.length > 0) {
        tables.chatMessages = data.chatMessages.length
        await db.chatMessages.clear()
        await db.chatMessages.bulkAdd(data.chatMessages as never[])
      }
      if (data.pinnedAnalyses.length > 0) {
        tables.pinnedAnalyses = data.pinnedAnalyses.length
        await db.pinnedAnalyses.clear()
        await db.pinnedAnalyses.bulkAdd(data.pinnedAnalyses as never[])
      }
      if (data.messageFeedback.length > 0) {
        tables.messageFeedback = data.messageFeedback.length
        await db.messageFeedback.clear()
        await db.messageFeedback.bulkAdd(data.messageFeedback as never[])
      }
    },
  )

  return { tables }
}
