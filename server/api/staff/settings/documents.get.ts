export default defineEventHandler(async (event) => {
  await requireRole(event, 'STAFF')
  const settings = await prisma.documentSettings.findUnique({ where: { id: 1 } })

  return {
    signerName: settings?.signerName ?? process.env.DOCUMENT_SIGNER_NAME ?? '',
    signerTitle: formatSignerTitleForDocument(settings?.signerTitle ?? process.env.DOCUMENT_SIGNER_TITLE ?? ''),
    hasSignature: Boolean(settings?.signaturePath ?? process.env.DOCUMENT_SIGNER_SIGNATURE_PATH),
    updatedAt: settings?.updatedAt ?? null,
    source: settings ? 'DATABASE' : 'ENVIRONMENT'
    ,templates: {
      requestLetter: settings?.requestLetterSampleName ?? null,
      sendingLetter: settings?.sendingLetterSampleName ?? null
    }
  }
})
