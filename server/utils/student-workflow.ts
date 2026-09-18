import type { CompanyApplicationStatus, CooperativeRequestStatus, DocumentStatus } from '~~/prisma/generated/client'

export const ACTIVE_APPLICATION_STATUSES: CompanyApplicationStatus[] = [
  'SUBMITTED',
  'AWAITING_RESPONSE',
  'INTERVIEW',
  'ACCEPTED'
]

export const ALLOWED_APPLICATION_TRANSITIONS: Record<CompanyApplicationStatus, CompanyApplicationStatus[]> = {
  SUBMITTED: ['AWAITING_RESPONSE', 'INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  AWAITING_RESPONSE: ['INTERVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
  CONFIRMED: []
}

export const ALLOWED_REQUEST_TRANSITIONS: Record<CooperativeRequestStatus, CooperativeRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['STAFF_PROCESSING', 'LETTER_READY', 'REJECTED', 'CANCELLED'],
  STAFF_PROCESSING: ['LETTER_READY', 'REJECTED', 'CANCELLED'],
  LETTER_READY: ['DOCUMENT_UNDER_REVIEW', 'CANCELLED'],
  DOCUMENT_UNDER_REVIEW: ['PLACEMENT_CONFIRMED', 'RETURNED_FOR_REVISION', 'REJECTED', 'CANCELLED'],
  RETURNED_FOR_REVISION: ['DOCUMENT_UNDER_REVIEW', 'CANCELLED'],
  PLACEMENT_CONFIRMED: [],
  REJECTED: [],
  CANCELLED: []
}

export const notifyUser = async (userId: number, title: string, message: string, link?: string) => {
  return prisma.notification.create({
    data: { userId, title, message, link }
  })
}
