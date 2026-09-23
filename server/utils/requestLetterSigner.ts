import fs from 'node:fs/promises'
import path from 'node:path'

export interface RequestLetterSigner {
  signerName: string
  signerTitleLines: string[]
  signatureImageBytes?: Uint8Array
}

export interface RequestLetterSignerEnv {
  signerName?: string
  signerTitle?: string
  signaturePath?: string
}

export type RequestLetterSignerErrorCode =
  | 'MISSING_SIGNER_NAME'
  | 'MISSING_SIGNER_TITLE'
  | 'SIGNATURE_FILE_NOT_READABLE'
  | 'INVALID_SIGNATURE_PNG'

export class RequestLetterSignerError extends Error {
  readonly code: RequestLetterSignerErrorCode

  constructor(code: RequestLetterSignerErrorCode) {
    // Safe user-facing message that does not leak any filesystem path or secret
    super('ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
    this.name = 'RequestLetterSignerError'
    this.code = code
  }
}

/**
 * Validates PNG signature using the 8-byte PNG file signature (RFC 2083):
 * 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
 */
export function isPng(buffer: Uint8Array): boolean {
  if (buffer.length < 8) return false
  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  )
}

/**
 * Splits a raw title string into an array of lines.
 * Supports both real newlines (\n, \r\n) and escaped literal \n.
 * Trims whitespace and removes empty lines.
 */
export function parseSignerTitleLines(rawTitle: string): string[] {
  const normalized = rawTitle.replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
  return normalized
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

/**
 * Loads signer configuration and reads an optional PNG signature file.
 * Signature file is lazily read only when this function is called.
 * Throws a controlled RequestLetterSignerError if required configuration is missing or the configured file is invalid.
 */
export async function loadRequestLetterSigner(
  envOverrides?: RequestLetterSignerEnv
): Promise<RequestLetterSigner> {
  const signerName = (
    envOverrides?.signerName ??
    process.env.DOCUMENT_SIGNER_NAME ??
    ''
  ).trim()

  if (!signerName) {
    throw new RequestLetterSignerError('MISSING_SIGNER_NAME')
  }

  const rawTitle = (
    envOverrides?.signerTitle ??
    process.env.DOCUMENT_SIGNER_TITLE ??
    ''
  ).trim()

  if (!rawTitle) {
    throw new RequestLetterSignerError('MISSING_SIGNER_TITLE')
  }

  const signerTitleLines = parseSignerTitleLines(rawTitle)
  if (signerTitleLines.length === 0) {
    throw new RequestLetterSignerError('MISSING_SIGNER_TITLE')
  }

  const signaturePath = (
    envOverrides?.signaturePath ??
    process.env.DOCUMENT_SIGNER_SIGNATURE_PATH ??
    ''
  ).trim()

  const signer = { signerName, signerTitleLines }
  if (!signaturePath) {
    return signer
  }

  // Resolve canonical path to guard against symlinks
  let canonicalPath: string
  try {
    canonicalPath = await fs.realpath(signaturePath)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return signer
    }
    throw new RequestLetterSignerError('SIGNATURE_FILE_NOT_READABLE')
  }

  // Guard: canonical path must NOT be located under public/ or .output/public/
  const cwd = process.cwd()
  const forbiddenDirs = [
    path.resolve(cwd, 'public'),
    path.resolve(cwd, '.output/public')
  ]

  for (const forbiddenDir of forbiddenDirs) {
    let canonicalForbiddenDir: string
    try {
      canonicalForbiddenDir = await fs.realpath(forbiddenDir)
    } catch {
      canonicalForbiddenDir = forbiddenDir
    }

    const rel = path.relative(canonicalForbiddenDir, canonicalPath)
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      throw new RequestLetterSignerError('SIGNATURE_FILE_NOT_READABLE')
    }
  }

  let fileBytes: Buffer
  try {
    fileBytes = await fs.readFile(canonicalPath)
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      return signer
    }
    throw new RequestLetterSignerError('SIGNATURE_FILE_NOT_READABLE')
  }

  const signatureImageBytes = new Uint8Array(fileBytes)
  if (!isPng(signatureImageBytes)) {
    throw new RequestLetterSignerError('INVALID_SIGNATURE_PNG')
  }

  return {
    signerName,
    signerTitleLines,
    signatureImageBytes
  }
}
