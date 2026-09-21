import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

export interface StoredLetterMetadata {
  filePath: string
  fileName: string
  fileSize: number
  sha256: string
}

export interface ResolvedStoredLetter {
  canonicalPath: string
  fileSize: number
}

export interface WriteRequestLetterOptions {
  requestId: number
  version: number
  pdfBytes: Uint8Array
  storageRoot?: string
}

export type LetterStorageErrorCode =
  | 'INVALID_INPUT'
  | 'OUTSIDE_STORAGE_ROOT'
  | 'FILE_NOT_FOUND'
  | 'NOT_A_REGULAR_FILE'
  | 'WRITE_FAILED'
  | 'CLEANUP_FAILED'
  | 'READ_FAILED'

export class LetterStorageError extends Error {
  readonly code: LetterStorageErrorCode

  constructor(code: LetterStorageErrorCode, message: string = 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ') {
    // Safe message that does not leak internal filesystem paths to the client
    super(message)
    this.name = 'LetterStorageError'
    this.code = code
  }
}

/**
 * Returns the resolved absolute storage root path.
 * Precedence: customRoot > process.env.PERSISTENT_STORAGE_DIR > <cwd>/uploads
 */
export function getStorageRoot(customRoot?: string): string {
  const root = customRoot || process.env.PERSISTENT_STORAGE_DIR || path.join(process.cwd(), 'uploads')
  return path.resolve(root)
}

/**
 * Returns the resolved path to the letters directory under storage root.
 */
export function getLettersDir(customRoot?: string): string {
  return path.join(getStorageRoot(customRoot), 'letters')
}

/**
 * Checks syntactic containment of targetPath strictly inside rootDir using path.relative().
 * Rejects empty path, rootDir itself, and any relative path that begins with '..' or is absolute.
 */
export function isPathContained(targetPath: string, rootDir: string): boolean {
  if (!targetPath || !rootDir) return false
  const resolvedTarget = path.resolve(targetPath)
  const resolvedRoot = path.resolve(rootDir)
  const rel = path.relative(resolvedRoot, resolvedTarget)
  return !rel.startsWith('..') && !path.isAbsolute(rel) && rel !== ''
}

/**
 * Resolves the canonical letters directory under storage root and verifies
 * that it is strictly contained within the canonical storage root.
 * Throws LetterStorageError if letters directory escapes storage root.
 */
export async function getVerifiedLettersDir(
  customRoot?: string
): Promise<{ canonicalRoot: string; canonicalLettersDir: string }> {
  const storageRoot = getStorageRoot(customRoot)
  const lettersDir = path.join(storageRoot, 'letters')

  try {
    await fs.mkdir(lettersDir, { recursive: true })
  } catch {
    try {
      await fs.access(lettersDir)
    } catch {
      throw new LetterStorageError('WRITE_FAILED', 'ไม่สามารถสร้างไดเรกทอรีจัดเก็บเอกสารได้')
    }
  }

  let canonicalRoot: string
  try {
    canonicalRoot = await fs.realpath(storageRoot)
  } catch {
    canonicalRoot = path.resolve(storageRoot)
  }

  let canonicalLettersDir: string
  try {
    canonicalLettersDir = await fs.realpath(lettersDir)
  } catch {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไดเรกทอรีจัดเก็บเอกสารไม่ปลอดภัย')
  }

  const rel = path.relative(canonicalRoot, canonicalLettersDir)
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel === '') {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไดเรกทอรีจัดเก็บเอกสารไม่ปลอดภัย')
  }

  return { canonicalRoot, canonicalLettersDir }
}

/**
 * Atomically writes a PDF document to verified <storageRoot>/letters/ with collision-proof filename.
 * Writes to a temporary file in the verified directory and renames it to ensure atomicity.
 * If writing or renaming fails, the temporary file is unlinked.
 */
export async function writeRequestLetterFile(
  options: WriteRequestLetterOptions
): Promise<StoredLetterMetadata> {
  const { requestId, version, pdfBytes, storageRoot: customRoot } = options

  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new LetterStorageError('INVALID_INPUT', 'รหัสคำร้องต้องเป็นจำนวนเต็มบวก')
  }

  if (!Number.isInteger(version) || version <= 0) {
    throw new LetterStorageError('INVALID_INPUT', 'เวอร์ชันเอกสารต้องเป็นจำนวนเต็มบวก')
  }

  if (!(pdfBytes instanceof Uint8Array) || pdfBytes.length === 0) {
    throw new LetterStorageError('INVALID_INPUT', 'ข้อมูลไฟล์ PDF ไม่ถูกต้องหรือเป็นไฟล์ว่าง')
  }

  const { canonicalLettersDir } = await getVerifiedLettersDir(customRoot)

  const randomSuffix = crypto.randomBytes(6).toString('hex')
  const fileName = `letter_${requestId}_v${version}_${Date.now()}_${randomSuffix}.pdf`
  const finalPath = path.join(canonicalLettersDir, fileName)
  const tempPath = path.join(canonicalLettersDir, `.${fileName}.${randomSuffix}.tmp`)

  try {
    await fs.writeFile(tempPath, pdfBytes)
    await fs.rename(tempPath, finalPath)
  } catch {
    await fs.unlink(tempPath).catch(() => {})
    throw new LetterStorageError('WRITE_FAILED', 'ไม่สามารถบันทึกไฟล์หนังสือในระบบจัดเก็บได้')
  }

  const sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex')

  return {
    filePath: finalPath,
    fileName,
    fileSize: pdfBytes.length,
    sha256
  }
}

/**
 * Resolves and validates an existing stored letter file strictly under verified <storageRoot>/letters/.
 * Verifies letters directory containment, syntactic containment, canonical containment, and regular file status.
 */
export async function resolveStoredLetterFile(
  filePath: string,
  customRoot?: string
): Promise<ResolvedStoredLetter> {
  if (!filePath || typeof filePath !== 'string') {
    throw new LetterStorageError('FILE_NOT_FOUND', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  const storageRoot = getStorageRoot(customRoot)
  const lettersDir = getLettersDir(storageRoot)

  // 1. Verify that letters directory itself is safe and strictly inside storage root
  const { canonicalLettersDir } = await getVerifiedLettersDir(customRoot)

  // 2. Syntactic containment check strictly within lettersDir or canonicalLettersDir
  const syntacticallyContained =
    isPathContained(filePath, lettersDir) || isPathContained(filePath, canonicalLettersDir)
  if (!syntacticallyContained) {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  // 3. Canonical containment check strictly within canonicalLettersDir
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(filePath)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      throw new LetterStorageError('FILE_NOT_FOUND', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
    }
    throw new LetterStorageError('READ_FAILED', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  if (!isPathContained(canonicalPath, canonicalLettersDir)) {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  // 4. Stat check: must be a regular file
  let stats: any
  try {
    stats = await fs.stat(canonicalPath)
  } catch {
    throw new LetterStorageError('FILE_NOT_FOUND', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  if (!stats.isFile()) {
    throw new LetterStorageError('NOT_A_REGULAR_FILE', 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
  }

  return {
    canonicalPath,
    fileSize: stats.size
  }
}

/**
 * Safely deletes a newly created letter file strictly under verified <storageRoot>/letters/.
 * Verifies letters directory containment via getVerifiedLettersDir.
 * Uses lstat on the caller-provided path to unconditionally reject symbolic links.
 * Verifies syntactic and canonical containment within letters directory before deleting.
 */
export async function cleanupStoredLetterFile(
  filePath: string,
  customRoot?: string
): Promise<void> {
  if (!filePath || typeof filePath !== 'string') return

  const storageRoot = getStorageRoot(customRoot)
  const lettersDir = getLettersDir(storageRoot)

  // 1. Verify that letters directory itself is safe and strictly inside storage root
  const { canonicalLettersDir } = await getVerifiedLettersDir(customRoot)

  // 2. Syntactic containment check strictly within lettersDir or canonicalLettersDir
  const syntacticallyContained =
    isPathContained(filePath, lettersDir) || isPathContained(filePath, canonicalLettersDir)
  if (!syntacticallyContained) {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไม่สามารถลบไฟล์นอกระบบจัดเก็บได้')
  }

  // 3. lstat check on caller-provided path: reject symlinks unconditionally
  let lstats: any
  try {
    lstats = await fs.lstat(filePath)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return
    }
    throw new LetterStorageError('CLEANUP_FAILED', 'ไม่สามารถเข้าถึงไฟล์เพื่อลบได้')
  }

  if (lstats.isSymbolicLink()) {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไม่อนุญาตให้ลบไฟล์ผ่านลิงก์สัญลักษณ์')
  }

  // 4. Canonical containment check strictly within canonicalLettersDir
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(filePath)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return
    }
    throw new LetterStorageError('CLEANUP_FAILED', 'ไม่สามารถเข้าถึงไฟล์เพื่อลบได้')
  }

  if (!isPathContained(canonicalPath, canonicalLettersDir)) {
    throw new LetterStorageError('OUTSIDE_STORAGE_ROOT', 'ไม่สามารถลบไฟล์นอกระบบจัดเก็บได้')
  }

  if (!lstats.isFile()) {
    throw new LetterStorageError('NOT_A_REGULAR_FILE', 'ไม่อนุญาตให้ลบไดเรกทอรีหรือออบเจ็กต์ที่ไม่ใช่ไฟล์')
  }

  try {
    await fs.unlink(canonicalPath)
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      throw new LetterStorageError('CLEANUP_FAILED', 'เกิดข้อผิดพลาดในการลบไฟล์')
    }
  }
}
