import { getFirebaseAuth } from '../lib/firebase'

const EMAIL_ENDPOINT = '/api/send-notification-email'

function isValidId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 256
}

export async function sendNotificationEmail(notification) {
  if (!isValidId(notification?.id) || !isValidId(notification?.userId)) {
    return { ok: false, sent: false, reason: 'invalid_notification' }
  }

  const auth = getFirebaseAuth()
  const currentUser = auth?.currentUser
  if (!currentUser) return { ok: true, sent: false, reason: 'no_authenticated_user' }

  try {
    const token = await currentUser.getIdToken()
    const recipientUid = notification.userId
    const response = await fetch(EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId: notification.id,
        recipientUid,
      }),
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.warn('[notificationEmailService] Email endpoint failed:', result.reason ?? response.status)
    }
    return result
  } catch (error) {
    console.warn('[notificationEmailService] Email side effect failed:', error.message)
    return { ok: false, sent: false, reason: 'email_request_failed' }
  }
}