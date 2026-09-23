import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import {
  getStorageRoot,
  getLettersDir,
  isPathContained,
  writeRequestLetterFile,
  resolveStoredLetterFile,
  cleanupStoredLetterFile,
  LetterStorageError
} from './letterStorage'

describe('letterStorage utility', () => {
  let tempStorageRoot: string
  let outsideDir: string

  // Minimal test PDF-like buffer
  const TEST_PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF')

  before(async () => {
    tempStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-root-'))
    outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-outside-'))
  })

  after(async () => {
    try {
      await fs.rm(tempStorageRoot, { recursive: true, force: true })
      await fs.rm(outsideDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  })

  it('resolves default and custom storage roots properly', () => {
    const custom = getStorageRoot(tempStorageRoot)
    assert.strictEqual(custom, path.resolve(tempStorageRoot))

    const originalEnv = process.env.PERSISTENT_STORAGE_DIR
    try {
      delete process.env.PERSISTENT_STORAGE_DIR
      const defaultRoot = getStorageRoot()
      assert.strictEqual(defaultRoot, path.resolve(process.cwd(), 'uploads'))

      process.env.PERSISTENT_STORAGE_DIR = '/custom/persistent/dir'
      const envRoot = getStorageRoot()
      assert.strictEqual(envRoot, path.resolve('/custom/persistent/dir'))
    } finally {
      if (originalEnv !== undefined) {
        process.env.PERSISTENT_STORAGE_DIR = originalEnv
      } else {
        delete process.env.PERSISTENT_STORAGE_DIR
      }
    }
  })

  it('creates letters directory and writes PDF atomically with correct metadata', async () => {
    const lettersDir = getLettersDir(tempStorageRoot)

    const result = await writeRequestLetterFile({
      requestId: 101,
      version: 1,
      pdfBytes: TEST_PDF_BYTES,
      storageRoot: tempStorageRoot
    })

    // Directory letters must exist
    const stats = await fs.stat(lettersDir)
    assert.ok(stats.isDirectory())

    // File must exist at result.filePath
    const fileStats = await fs.stat(result.filePath)
    assert.ok(fileStats.isFile())
    assert.strictEqual(fileStats.size, TEST_PDF_BYTES.length)
    assert.strictEqual(result.fileSize, TEST_PDF_BYTES.length)

    // Expected SHA-256
    const expectedSha256 = crypto.createHash('sha256').update(TEST_PDF_BYTES).digest('hex')
    assert.strictEqual(result.sha256, expectedSha256)

    // Verify content read matches exactly
    const readBytes = await fs.readFile(result.filePath)
    assert.deepStrictEqual(readBytes, TEST_PDF_BYTES)

    // Filename must contain requestId and version
    assert.ok(result.fileName.startsWith('letter_101_v1_'))
    assert.ok(result.fileName.endsWith('.pdf'))
  })

  it('generates unique filenames when written rapidly without collision', async () => {
    const writes = await Promise.all([
      writeRequestLetterFile({ requestId: 202, version: 1, pdfBytes: TEST_PDF_BYTES, storageRoot: tempStorageRoot }),
      writeRequestLetterFile({ requestId: 202, version: 1, pdfBytes: TEST_PDF_BYTES, storageRoot: tempStorageRoot }),
      writeRequestLetterFile({ requestId: 202, version: 1, pdfBytes: TEST_PDF_BYTES, storageRoot: tempStorageRoot })
    ])

    const fileNames = writes.map(w => w.fileName)
    const uniqueNames = new Set(fileNames)
    assert.strictEqual(uniqueNames.size, 3, 'All filenames must be unique')
  })

  it('validates write inputs strictly', async () => {
    await assert.rejects(
      async () => {
        await writeRequestLetterFile({
          requestId: 0,
          version: 1,
          pdfBytes: TEST_PDF_BYTES,
          storageRoot: tempStorageRoot
        })
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'INVALID_INPUT')
        return true
      }
    )

    await assert.rejects(
      async () => {
        await writeRequestLetterFile({
          requestId: 1,
          version: -1,
          pdfBytes: TEST_PDF_BYTES,
          storageRoot: tempStorageRoot
        })
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'INVALID_INPUT')
        return true
      }
    )

    await assert.rejects(
      async () => {
        await writeRequestLetterFile({
          requestId: 1,
          version: 1,
          pdfBytes: new Uint8Array(0),
          storageRoot: tempStorageRoot
        })
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'INVALID_INPUT')
        return true
      }
    )
  })

  it('ensures caller cannot specify filename or path during write', async () => {
    const customOption = {
      requestId: 301,
      version: 1,
      pdfBytes: TEST_PDF_BYTES,
      storageRoot: tempStorageRoot,
      fileName: 'hacked_name.pdf',
      filePath: '/tmp/hacked_file.pdf',
      fixedFileName: 'hacked_fixed.pdf'
    } as any

    const result = await writeRequestLetterFile(customOption)

    assert.notStrictEqual(result.fileName, 'hacked_name.pdf')
    assert.notStrictEqual(result.fileName, 'hacked_fixed.pdf')
    assert.notStrictEqual(result.filePath, '/tmp/hacked_file.pdf')
    assert.ok(result.fileName.startsWith('letter_301_v1_'))
    assert.ok(isPathContained(result.filePath, await fs.realpath(getLettersDir(tempStorageRoot))))
  })

  it('cleans up temporary artifact when writing fails', async () => {
    const lettersDir = getLettersDir(tempStorageRoot)
    await fs.mkdir(lettersDir, { recursive: true })

    // Set letters directory to read-only (0o500) so fs.writeFile fails
    await fs.chmod(lettersDir, 0o500)

    try {
      await assert.rejects(
        async () => {
          await writeRequestLetterFile({
            requestId: 303,
            version: 1,
            pdfBytes: TEST_PDF_BYTES,
            storageRoot: tempStorageRoot
          })
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'WRITE_FAILED')
          return true
        }
      )
    } finally {
      // Restore permissions
      await fs.chmod(lettersDir, 0o700)
    }

    // Verify no leftover .tmp files exist in lettersDir
    const filesInDir = await fs.readdir(lettersDir)
    const tempFiles = filesInDir.filter(f => f.includes('.tmp'))
    assert.strictEqual(tempFiles.length, 0, 'No temporary file should remain on failure')
  })

  it('rejects write when letters/ is a symlink pointing to an outside directory', async () => {
    const symlinkStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-symlink-root-'))
    const outsideTarget = path.join(outsideDir, 'symlinked_letters_target')
    await fs.mkdir(outsideTarget, { recursive: true })

    // Create letters as a symlink pointing to outsideTarget
    const symlinkLetters = path.join(symlinkStorageRoot, 'letters')
    await fs.symlink(outsideTarget, symlinkLetters)

    try {
      await assert.rejects(
        async () => {
          await writeRequestLetterFile({
            requestId: 999,
            version: 1,
            pdfBytes: TEST_PDF_BYTES,
            storageRoot: symlinkStorageRoot
          })
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          return true
        }
      )

      // Confirm no file was written to outsideTarget
      const filesWritten = await fs.readdir(outsideTarget)
      assert.strictEqual(filesWritten.length, 0, 'No file should be written to outside directory')
    } finally {
      await fs.rm(symlinkStorageRoot, { recursive: true, force: true }).catch(() => {})
      await fs.rm(outsideTarget, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('resolves existing stored file and rejects missing file with controlled error', async () => {
    const written = await writeRequestLetterFile({
      requestId: 404,
      version: 1,
      pdfBytes: TEST_PDF_BYTES,
      storageRoot: tempStorageRoot
    })

    const resolved = await resolveStoredLetterFile(written.filePath, tempStorageRoot)
    assert.strictEqual(resolved.fileSize, TEST_PDF_BYTES.length)
    assert.ok(path.isAbsolute(resolved.canonicalPath))

    // Missing file
    const missingPath = path.join(getLettersDir(tempStorageRoot), 'not_exists.pdf')
    await assert.rejects(
      async () => {
        await resolveStoredLetterFile(missingPath, tempStorageRoot)
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'FILE_NOT_FOUND')
        assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
        return true
      }
    )
  })

  it('rejects read when file is in storage root but outside letters/', async () => {
    const rootLevelFile = path.join(tempStorageRoot, 'root_level_file.pdf')
    await fs.writeFile(rootLevelFile, TEST_PDF_BYTES)

    try {
      await assert.rejects(
        async () => {
          await resolveStoredLetterFile(rootLevelFile, tempStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
          return true
        }
      )
    } finally {
      await fs.unlink(rootLevelFile).catch(() => {})
    }
  })

  it('rejects path traversal and paths outside storage root', async () => {
    // Relative traversal escaping letters directory
    const traversalPath = path.join(getLettersDir(tempStorageRoot), '../../outside.pdf')
    await assert.rejects(
      async () => {
        await resolveStoredLetterFile(traversalPath, tempStorageRoot)
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
        assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
        return true
      }
    )

    // Absolute path pointing to outside directory
    const outsideFile = path.join(outsideDir, 'secret.pdf')
    await fs.writeFile(outsideFile, TEST_PDF_BYTES)

    await assert.rejects(
      async () => {
        await resolveStoredLetterFile(outsideFile, tempStorageRoot)
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
        assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
        return true
      }
    )
  })

  it('rejects symlinks that point outside storage root during read', async () => {
    const outsideFile = path.join(outsideDir, 'external_target.pdf')
    await fs.writeFile(outsideFile, TEST_PDF_BYTES)

    const symlinkInLetters = path.join(getLettersDir(tempStorageRoot), 'symlink_to_outside.pdf')
    await fs.symlink(outsideFile, symlinkInLetters)

    try {
      await assert.rejects(
        async () => {
          await resolveStoredLetterFile(symlinkInLetters, tempStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
          return true
        }
      )
    } finally {
      await fs.unlink(symlinkInLetters).catch(() => {})
    }
  })

  it('rejects read when letters/ is a symlink pointing to an outside directory even if target file exists', async () => {
    const symlinkStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-read-symlink-root-'))
    const outsideTargetDir = path.join(outsideDir, 'symlinked_read_target')
    await fs.mkdir(outsideTargetDir, { recursive: true })

    const existingFile = path.join(outsideTargetDir, 'legit_looking.pdf')
    await fs.writeFile(existingFile, TEST_PDF_BYTES)

    // Create letters as a symlink pointing to outsideTargetDir
    const symlinkLetters = path.join(symlinkStorageRoot, 'letters')
    await fs.symlink(outsideTargetDir, symlinkLetters)

    const fileInSymlinkedLetters = path.join(symlinkLetters, 'legit_looking.pdf')

    try {
      await assert.rejects(
        async () => {
          await resolveStoredLetterFile(fileInSymlinkedLetters, symlinkStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          return true
        }
      )
    } finally {
      await fs.rm(symlinkStorageRoot, { recursive: true, force: true }).catch(() => {})
      await fs.rm(outsideTargetDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('rejects cleanup when letters/ is a symlink pointing to an outside directory and preserves outside file', async () => {
    const symlinkStorageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-clean-symlink-root-'))
    const outsideTargetDir = path.join(outsideDir, 'symlinked_clean_target')
    await fs.mkdir(outsideTargetDir, { recursive: true })

    const outsideTargetFile = path.join(outsideTargetDir, 'do_not_delete_outside.pdf')
    await fs.writeFile(outsideTargetFile, TEST_PDF_BYTES)

    // Create letters as a symlink pointing to outsideTargetDir
    const symlinkLetters = path.join(symlinkStorageRoot, 'letters')
    await fs.symlink(outsideTargetDir, symlinkLetters)

    const fileInSymlinkedLetters = path.join(symlinkLetters, 'do_not_delete_outside.pdf')

    try {
      await assert.rejects(
        async () => {
          await cleanupStoredLetterFile(fileInSymlinkedLetters, symlinkStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          return true
        }
      )

      // Outside file must still exist!
      const statAfter = await fs.stat(outsideTargetFile)
      assert.ok(statAfter.isFile(), 'Outside file must not be deleted when letters/ is a symlink')
    } finally {
      await fs.rm(symlinkStorageRoot, { recursive: true, force: true }).catch(() => {})
      await fs.rm(outsideTargetDir, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('rejects resolving a directory instead of a regular file', async () => {
    const subDirPath = path.join(getLettersDir(tempStorageRoot), 'some_subdir')
    await fs.mkdir(subDirPath, { recursive: true })

    try {
      await assert.rejects(
        async () => {
          await resolveStoredLetterFile(subDirPath, tempStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'NOT_A_REGULAR_FILE')
          assert.strictEqual(err.message, 'ไม่พบไฟล์หนังสือในระบบจัดเก็บ')
          return true
        }
      )
    } finally {
      await fs.rm(subDirPath, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('safely cleans up files under storage root and refuses to delete outside', async () => {
    // 1. Valid file deletion
    const written = await writeRequestLetterFile({
      requestId: 505,
      version: 1,
      pdfBytes: TEST_PDF_BYTES,
      storageRoot: tempStorageRoot
    })

    // Must exist
    await fs.access(written.filePath)

    // Cleanup
    await cleanupStoredLetterFile(written.filePath, tempStorageRoot)

    // Must no longer exist
    await assert.rejects(
      async () => {
        await fs.access(written.filePath)
      },
      { code: 'ENOENT' }
    )

    // 2. Refuses to delete outside storage root
    const outsideFile = path.join(outsideDir, 'do_not_delete.pdf')
    await fs.writeFile(outsideFile, TEST_PDF_BYTES)

    await assert.rejects(
      async () => {
        await cleanupStoredLetterFile(outsideFile, tempStorageRoot)
      },
      (err: any) => {
        assert.ok(err instanceof LetterStorageError)
        assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
        return true
      }
    )

    // Outside file must still exist
    const statAfter = await fs.stat(outsideFile)
    assert.ok(statAfter.isFile(), 'Outside file must not have been deleted')

    // 3. Refuses to delete files in storage root but outside letters/
    const rootLevelFile = path.join(tempStorageRoot, 'do_not_delete_root.pdf')
    await fs.writeFile(rootLevelFile, TEST_PDF_BYTES)

    try {
      await assert.rejects(
        async () => {
          await cleanupStoredLetterFile(rootLevelFile, tempStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          return true
        }
      )
      assert.ok((await fs.stat(rootLevelFile)).isFile())
    } finally {
      await fs.unlink(rootLevelFile).catch(() => {})
    }
  })

  it('rejects cleanup when symlink inside letters/ points to a regular file inside letters/ and preserves target', async () => {
    const written = await writeRequestLetterFile({
      requestId: 606,
      version: 1,
      pdfBytes: TEST_PDF_BYTES,
      storageRoot: tempStorageRoot
    })

    const symlinkInternal = path.join(getLettersDir(tempStorageRoot), 'symlink_internal.pdf')
    await fs.symlink(written.filePath, symlinkInternal)

    try {
      await assert.rejects(
        async () => {
          await cleanupStoredLetterFile(symlinkInternal, tempStorageRoot)
        },
        (err: any) => {
          assert.ok(err instanceof LetterStorageError)
          assert.strictEqual(err.code, 'OUTSIDE_STORAGE_ROOT')
          assert.strictEqual(err.message, 'ไม่อนุญาตให้ลบไฟล์ผ่านลิงก์สัญลักษณ์')
          return true
        }
      )

      // Target file MUST still exist and be completely intact!
      const targetStat = await fs.stat(written.filePath)
      assert.ok(targetStat.isFile(), 'Target file must not be deleted through symlink')
    } finally {
      await fs.unlink(symlinkInternal).catch(() => {})
      await fs.unlink(written.filePath).catch(() => {})
    }
  })

  it('isPathContained correctly identifies strictly contained paths', () => {
    const root = '/var/app/uploads'
    assert.strictEqual(isPathContained('/var/app/uploads/letters/doc.pdf', root), true)
    assert.strictEqual(isPathContained('/var/app/uploads/letters/sub/doc.pdf', root), true)
    assert.strictEqual(isPathContained('/var/app/uploads', root), false, 'Root itself is not inside root')
    assert.strictEqual(isPathContained('/var/app/uploads/../secret.txt', root), false)
    assert.strictEqual(isPathContained('/var/app/uploads/letters/../../outside.txt', root), false)
    assert.strictEqual(isPathContained('/etc/passwd', root), false)
    assert.strictEqual(isPathContained('', root), false)
  })
})
