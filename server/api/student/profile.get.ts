export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'STUDENT')

  return {
    id: user.id,
    loginId: user.loginId,
    prefix: user.prefix,
    firstName: user.firstName,
    lastName: user.lastName,
    name: [user.prefix, user.firstName, user.lastName].filter(Boolean).join(' '),
    phone: user.phone,
    gender: user.gender,
    cohortYear: user.cohortYear,
    classGroup: user.classGroup,
    isActive: user.isActive
  }
})
