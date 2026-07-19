import { beforeEach, describe, expect, it, vi } from 'vitest'

const writeFile = vi.fn()
const share = vi.fn()
let nativePlatform = false

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => nativePlatform,
  },
}))

vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile },
}))

vi.mock('@capacitor/share', () => ({
  Share: { share },
}))

describe('saveTextFile', () => {
  beforeEach(() => {
    nativePlatform = false
    writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/export.txt' })
    share.mockReset().mockResolvedValue(undefined)
  })

  it('writes and shares files on native mobile', async () => {
    nativePlatform = true
    const { saveTextFile } = await import('../nativeShare')

    await saveTextFile('hello', 'bad:name.txt', 'text/plain')

    expect(writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: 'exports/bad-name.txt',
      data: 'hello',
      recursive: true,
    }))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      files: ['file:///cache/export.txt'],
    }))
  })
})
