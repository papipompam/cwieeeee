import { prisma } from '~~/server/utils/db'
import type { RequestLetterSignerEnv } from '~~/server/utils/requestLetterSigner'

const LEGACY_DEAN_TITLE = 'คณบดีคณะวิทยาศาสตร์ ปฏิบัติราชการแทน อธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'
const FORMATTED_DEAN_TITLE = 'คณบดีคณะวิทยาศาสตร์\nปฏิบัติราชการแทน\nอธิการบดีมหาวิทยาลัยราชภัฏบุรีรัมย์'

export function formatSignerTitleForDocument(title: string): string {
  return title.trim() === LEGACY_DEAN_TITLE ? FORMATTED_DEAN_TITLE : title
}

export async function getDocumentSignerOverrides(): Promise<RequestLetterSignerEnv | undefined> {
  const settings = await prisma.documentSettings.findUnique({ where: { id: 1 } })

  return {
    signerName: settings?.signerName ?? process.env.DOCUMENT_SIGNER_NAME,
    signerTitle: formatSignerTitleForDocument(settings?.signerTitle ?? process.env.DOCUMENT_SIGNER_TITLE ?? ''),
    signaturePath: settings?.signaturePath ?? process.env.DOCUMENT_SIGNER_SIGNATURE_PATH
  }
}
