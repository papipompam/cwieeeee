export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')
  const body = await readBody(event)

  const phone = typeof body?.phone === 'string' ? body.phone.trim() : user.phone

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phone }
  })

  return {
    id: updated.id,
    loginId: updated.loginId,
    prefix: updated.prefix,
    firstName: updated.firstName,
    lastName: updated.lastName,
    name: [updated.prefix, updated.firstName, updated.lastName].filter(Boolean).join(' '),
    phone: updated.phone,
    cohortYear: updated.cohortYear,
    classGroup: updated.classGroup,
    isActive: updated.isActive
  }
})
