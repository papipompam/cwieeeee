export default defineEventHandler(async () => {
  const [schema] = await prisma.$queryRaw<Array<{ ready: boolean }>>`
    SELECT to_regclass('public.users') IS NOT NULL
       AND to_regclass('public.document_settings') IS NOT NULL AS ready
  `
  if (!schema?.ready) throw createError({ statusCode: 503, message: 'Database schema is not ready' })
  return { status: 'ok' }
})
