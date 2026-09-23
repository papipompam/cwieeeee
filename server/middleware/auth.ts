export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || path.startsWith('/api/auth/') || path === '/api/health' || path.startsWith('/api/geo/') || path.startsWith('/api/notifications')) return

  if (path.startsWith('/api/student/')) {
    await requireRole(event, 'STUDENT')
    return
  }

  if (path.startsWith('/api/teacher/')) {
    await requireRole(event, 'TEACHER')
    return
  }

  await requireRole(event, 'STAFF')
})
