import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  loadRequestLetterSigner,
  parseSignerTitleLines,
  isPng,
  RequestLetterSignerError
} from './requestLetterSigner'

// Minimal 1x1 valid PNG (67 bytes)
const VALID_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

describe('requestLetterSigner utility', () => {
  let tempDir: string
  let validPngPath: string
  let invalidFilePath: string

  before(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'signer-test-'))
    validPngPath = path.join(tempDir, 'valid_sig.png')
    invalidFilePath = path.join(tempDir, 'fake_sig.png')

    await fs.writeFile(validPngPath, VALID_PNG_BYTES)
    await fs.writeFile(invalidFilePath, Buffer.from('NOT_A_PNG_FILE_CONTENT'))
  })

  after(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('validates PNG magic bytes correctly with isPng', () => {
    assert.strictEqual(isPng(VALID_PNG_BYTES), true)
    assert.strictEqual(isPng(Buffer.from('NOT_A_PNG')), false)
    assert.strictEqual(isPng(new Uint8Array([0x89, 0x50, 0x4e])), false)
  })

  it('parses multi-line signer title and removes blank lines', () => {
    const raw = '  คณบดีคณะวิทยาศาสตร์ \n\n  ปฏิบัติราชการแทน  \n   \n อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์  '
    const lines = parseSignerTitleLines(raw)
    assert.deepStrictEqual(lines, [
      'คณบดีคณะวิทยาศาสตร์',
      'ปฏิบัติราชการแทน',
      'อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
    ])

    // Also supports escaped literal \\n
    const escaped = 'รองคณบดี\\nปฏิบัติราชการแทนคณบดี'
    const escapedLines = parseSignerTitleLines(escaped)
    assert.deepStrictEqual(escapedLines, ['รองคณบดี', 'ปฏิบัติราชการแทนคณบดี'])
  })

  it('loads valid signer configuration and returns expected properties', async () => {
    const result = await loadRequestLetterSigner({
      signerName: 'ผู้ช่วยศาสตราจารย์ ดร.ทดสอบ ลงนาม',
      signerTitle: 'คณบดีคณะวิทยาศาสตร์\nปฏิบัติราชการแทน',
      signaturePath: validPngPath
    })

    assert.strictEqual(result.signerName, 'ผู้ช่วยศาสตราจารย์ ดร.ทดสอบ ลงนาม')
    assert.deepStrictEqual(result.signerTitleLines, ['คณบดีคณะวิทยาศาสตร์', 'ปฏิบัติราชการแทน'])
    assert.ok(result.signatureImageBytes instanceof Uint8Array)
    assert.strictEqual(result.signatureImageBytes.length, VALID_PNG_BYTES.length)
  })

  it('rejects missing or empty signerName with controlled error', async () => {
    await assert.rejects(
      async () => {
        await loadRequestLetterSigner({
          signerName: '   ',
          signerTitle: 'คณบดีคณะวิทยาศาสตร์',
          signaturePath: validPngPath
        })
      },
      (err: any) => {
        assert.ok(err instanceof RequestLetterSignerError)
        assert.strictEqual(err.code, 'MISSING_SIGNER_NAME')
        assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
        return true
      }
    )
  })

  it('rejects missing or empty signerTitle with controlled error', async () => {
    await assert.rejects(
      async () => {
        await loadRequestLetterSigner({
          signerName: 'อาจารย์ ผู้ลงนาม',
          signerTitle: '   \n  \n  ',
          signaturePath: validPngPath
        })
      },
      (err: any) => {
        assert.ok(err instanceof RequestLetterSignerError)
        assert.strictEqual(err.code, 'MISSING_SIGNER_TITLE')
        assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
        return true
      }
    )
  })

  it('allows document generation without a signature file', async () => {
    const signer = await loadRequestLetterSigner({
      signerName: 'อาจารย์ ผู้ลงนาม',
      signerTitle: 'คณบดีคณะวิทยาศาสตร์',
      signaturePath: ''
    })

    assert.strictEqual(signer.signerName, 'อาจารย์ ผู้ลงนาม')
    assert.deepStrictEqual(signer.signerTitleLines, ['คณบดีคณะวิทยาศาสตร์'])
    assert.strictEqual(signer.signatureImageBytes, undefined)
  })

  it('allows document generation when a previously configured signature file is gone', async () => {
    const nonExistentPath = path.join(tempDir, 'does_not_exist_12345.png')
    const signer = await loadRequestLetterSigner({
      signerName: 'อาจารย์ ผู้ลงนาม',
      signerTitle: 'คณบดีคณะวิทยาศาสตร์',
      signaturePath: nonExistentPath
    })

    assert.strictEqual(signer.signatureImageBytes, undefined)
  })

  it('rejects non-PNG files with controlled error', async () => {
    await assert.rejects(
      async () => {
        await loadRequestLetterSigner({
          signerName: 'อาจารย์ ผู้ลงนาม',
          signerTitle: 'คณบดีคณะวิทยาศาสตร์',
          signaturePath: invalidFilePath
        })
      },
      (err: any) => {
        assert.ok(err instanceof RequestLetterSignerError)
        assert.strictEqual(err.code, 'INVALID_SIGNATURE_PNG')
        assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
        return true
      }
    )
  })

  it('rejects signature files located inside public/ directory', async () => {
    const publicForbiddenPath = path.resolve(process.cwd(), 'public/.test_public_sig.png')
    await fs.writeFile(publicForbiddenPath, VALID_PNG_BYTES)

    try {
      await assert.rejects(
        async () => {
          await loadRequestLetterSigner({
            signerName: 'อาจารย์ ผู้ลงนาม',
            signerTitle: 'คณบดีคณะวิทยาศาสตร์',
            signaturePath: publicForbiddenPath
          })
        },
        (err: any) => {
          assert.ok(err instanceof RequestLetterSignerError)
          assert.strictEqual(err.code, 'SIGNATURE_FILE_NOT_READABLE')
          assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
          return true
        }
      )
    } finally {
      await fs.unlink(publicForbiddenPath).catch(() => {})
    }
  })

  it('rejects symlink that points into public/ directory', async () => {
    const targetInPublic = path.resolve(process.cwd(), 'public/.test_symlink_target.png')
    const symlinkInTemp = path.join(tempDir, 'symlink_to_public.png')

    await fs.writeFile(targetInPublic, VALID_PNG_BYTES)
    await fs.symlink(targetInPublic, symlinkInTemp)

    try {
      await assert.rejects(
        async () => {
          await loadRequestLetterSigner({
            signerName: 'อาจารย์ ผู้ลงนาม',
            signerTitle: 'คณบดีคณะวิทยาศาสตร์',
            signaturePath: symlinkInTemp
          })
        },
        (err: any) => {
          assert.ok(err instanceof RequestLetterSignerError)
          assert.strictEqual(err.code, 'SIGNATURE_FILE_NOT_READABLE')
          assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
          return true
        }
      )
    } finally {
      await fs.unlink(symlinkInTemp).catch(() => {})
      await fs.unlink(targetInPublic).catch(() => {})
    }
  })

  it('rejects signature files located inside .output/public/ directory', async () => {
    const outputPublicDir = path.resolve(process.cwd(), '.output/public')
    await fs.mkdir(outputPublicDir, { recursive: true })
    const outputForbiddenPath = path.resolve(outputPublicDir, '.test_output_sig.png')
    await fs.writeFile(outputForbiddenPath, VALID_PNG_BYTES)

    try {
      await assert.rejects(
        async () => {
          await loadRequestLetterSigner({
            signerName: 'อาจารย์ ผู้ลงนาม',
            signerTitle: 'คณบดีคณะวิทยาศาสตร์',
            signaturePath: outputForbiddenPath
          })
        },
        (err: any) => {
          assert.ok(err instanceof RequestLetterSignerError)
          assert.strictEqual(err.code, 'SIGNATURE_FILE_NOT_READABLE')
          assert.strictEqual(err.message, 'ยังไม่ได้ตั้งค่าผู้ลงนามสำหรับการออกเอกสาร')
          return true
        }
      )
    } finally {
      await fs.unlink(outputForbiddenPath).catch(() => {})
    }
  })

  it('reads from process.env when no overrides provided and restores env', async () => {
    const originalName = process.env.DOCUMENT_SIGNER_NAME
    const originalTitle = process.env.DOCUMENT_SIGNER_TITLE
    const originalPath = process.env.DOCUMENT_SIGNER_SIGNATURE_PATH

    try {
      process.env.DOCUMENT_SIGNER_NAME = 'ศ.ดร.ผ่าน ตัวแปรสภาพแวดล้อม'
      process.env.DOCUMENT_SIGNER_TITLE = 'คณบดี'
      process.env.DOCUMENT_SIGNER_SIGNATURE_PATH = validPngPath

      const res = await loadRequestLetterSigner()
      assert.strictEqual(res.signerName, 'ศ.ดร.ผ่าน ตัวแปรสภาพแวดล้อม')
      assert.deepStrictEqual(res.signerTitleLines, ['คณบดี'])
      assert.strictEqual(res.signatureImageBytes?.length, VALID_PNG_BYTES.length)
    } finally {
      if (originalName !== undefined) process.env.DOCUMENT_SIGNER_NAME = originalName
      else delete process.env.DOCUMENT_SIGNER_NAME

      if (originalTitle !== undefined) process.env.DOCUMENT_SIGNER_TITLE = originalTitle
      else delete process.env.DOCUMENT_SIGNER_TITLE

      if (originalPath !== undefined) process.env.DOCUMENT_SIGNER_SIGNATURE_PATH = originalPath
      else delete process.env.DOCUMENT_SIGNER_SIGNATURE_PATH
    }
  })
})
