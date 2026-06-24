export type NotificationType =
  | "SYSTEM"
  | "PROPOSAL_RECEIVED"
  | "PROPOSAL_ACCEPTED"
  | "PROPOSAL_REJECTED"
  | "MESSAGE_RECEIVED"
  | "SERVICE_UPDATED"
  | "REVIEW_RECEIVED"

export type AppNotification = {
  id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  createdAt: string
}
