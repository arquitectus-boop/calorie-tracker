/**
 * Food photos: client-side compress + IndexedDB storage.
 * Catalog items keep only a photoId; the JPEG data URL lives here.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** Longest edge after resize (px). */
export const PHOTO_MAX_EDGE = 512
/** JPEG quality for canvas.toDataURL (0–1). */
export const PHOTO_JPEG_QUALITY = 0.7

export interface PhotoRecord {
  id: string
  dataUrl: string
  createdAt: number
}

interface PhotoDB extends DBSchema {
  photos: {
    key: string
    value: PhotoRecord
  }
}

const DB_NAME = 'calorie-tracker-photos'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<PhotoDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PhotoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function putPhoto(dataUrl: string, id = crypto.randomUUID()): Promise<string> {
  const record: PhotoRecord = { id, dataUrl, createdAt: Date.now() }
  try {
    const db = await getDB()
    await db.put('photos', record)
  } catch {
    // IndexedDB unavailable — photo won't persist across reloads
  }
  return id
}

export async function getPhoto(id: string): Promise<string | undefined> {
  try {
    const db = await getDB()
    const row = await db.get('photos', id)
    return row?.dataUrl
  } catch {
    return undefined
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('photos', id)
  } catch {
    // ignore
  }
}

export async function loadAllPhotos(): Promise<Record<string, string>> {
  try {
    const db = await getDB()
    const all = await db.getAll('photos')
    const map: Record<string, string> = {}
    for (const row of all) map[row.id] = row.dataUrl
    return map
  } catch {
    return {}
  }
}

/** Replace the entire photo store (used by backup restore). */
export async function replaceAllPhotos(map: Record<string, string>): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction('photos', 'readwrite')
    await tx.store.clear()
    const now = Date.now()
    for (const [id, dataUrl] of Object.entries(map)) {
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        await tx.store.put({ id, dataUrl, createdAt: now })
      }
    }
    await tx.done
  } catch {
    // ignore
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem'))
    }
    img.src = url
  })
}

/**
 * Resize so the longest edge is ≤ PHOTO_MAX_EDGE and encode as JPEG.
 * Returns a data URL suitable for IndexedDB / backup.
 */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('O ficheiro não é uma imagem')
  }

  let bitmap: ImageBitmap | null = null
  let width: number
  let height: number
  let source: CanvasImageSource

  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(file)
      width = bitmap.width
      height = bitmap.height
      source = bitmap
    } else {
      const img = await loadImageFromFile(file)
      width = img.naturalWidth || img.width
      height = img.naturalHeight || img.height
      source = img
    }
  } catch {
    throw new Error('Não foi possível processar a imagem')
  }

  const maxEdge = Math.max(width, height)
  const scale = maxEdge > PHOTO_MAX_EDGE ? PHOTO_MAX_EDGE / maxEdge : 1
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap?.close()
    throw new Error('Canvas não disponível')
  }
  ctx.drawImage(source, 0, 0, w, h)
  bitmap?.close()

  try {
    return canvas.toDataURL('image/jpeg', PHOTO_JPEG_QUALITY)
  } catch {
    throw new Error('Não foi possível comprimir a imagem')
  }
}

/** Validate backup photo map entries (data URLs only). */
export function parsePhotoMap(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [id, dataUrl] of Object.entries(value as Record<string, unknown>)) {
    if (typeof id !== 'string' || id.length === 0) continue
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue
    out[id] = dataUrl
  }
  return out
}
