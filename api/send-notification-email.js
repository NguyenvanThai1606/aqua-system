import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { Resend } from 'resend'

const MAX_ID_LENGTH = 256
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Vercel functions are ephemeral, so this Set is only an extra
// best-effort guard. Resend idempotency is the real duplicate protection.
const sentNotificationIds = new Set()
const processingNotificationIds = new Set()

function json(res, status, body) {
  return res.status(status).json(body)
}

function isValidId(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_ID_LENGTH
  )
}

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_PATTERN.test(value.trim())
}

function getServerConfig() {
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM

  return {
    projectId,
    clientEmail,
    privateKey,
    resendApiKey,
    emailFrom,
    firebaseAdminConfigured: Boolean(projectId && clientEmail && privateKey),
    emailConfigured: Boolean(resendApiKey && emailFrom),
  }
}

function getAdminApp(config) {
  const existing = getApps()[0]

  if (existing) {
    return existing
  }

  return initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  })
}

function getBearerToken(req) {
  const header = req.headers.authorization || ''

  if (!header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim() || null
}

function cleanText(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildEmailContent(notification) {
  const title = cleanText(notification.title) || 'Thông báo mới'
  const message = cleanText(notification.message)
  const type = cleanText(notification.type)
  const actorName = cleanText(notification.actorName)
  const relatedType = cleanText(notification.relatedType)
  const relatedId = cleanText(notification.relatedId)

  const lines = [
    'AQUA',
    '',
    title,
    '',
    message || 'Bạn có một thông báo mới trong AQUA.',
  ]

  if (type) {
    lines.push('', `Loại thông báo: ${type}`)
  }

  if (actorName) {
    lines.push('', `Người tạo: ${actorName}`)
  }

  if (relatedType) {
    lines.push('', `Loại liên quan: ${relatedType}`)
  }

  if (relatedId) {
    lines.push(`ID liên quan: ${relatedId}`)
  }

  const html = [
    '<!doctype html>',
    '<html>',
    '<body>',
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;">',
    '<p><strong>AQUA</strong></p>',
    `<h2>${escapeHtml(title)}</h2>`,
    `<p>${escapeHtml(message || 'Bạn có một thông báo mới trong AQUA.').replaceAll('\n', '<br>')}</p>`,
    type
      ? `<p><strong>Loại thông báo:</strong> ${escapeHtml(type)}</p>`
      : '',
    actorName
      ? `<p><strong>Người tạo:</strong> ${escapeHtml(actorName)}</p>`
      : '',
    relatedType
      ? `<p><strong>Loại liên quan:</strong> ${escapeHtml(relatedType)}${
          relatedId ? ` (${escapeHtml(relatedId)})` : ''
        }</p>`
      : '',
    '<hr>',
    '<p style="color:#777;font-size:12px;">Email tự động từ hệ thống AQUA.</p>',
    '</div>',
    '</body>',
    '</html>',
  ].join('')

  return {
    subject: `AQUA - ${title}`,
    text: lines.join('\n'),
    html,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, {
      ok: false,
      sent: false,
      reason: 'method_not_allowed',
    })
  }

  const notificationId = req.body?.notificationId
  const recipientUid = req.body?.recipientUid

  // The browser is allowed to send only IDs.
  // Notification content and recipient email are always loaded server-side.
  if (!isValidId(notificationId) || !isValidId(recipientUid)) {
    return json(res, 400, {
      ok: false,
      sent: false,
      reason: 'invalid_request',
    })
  }

  const config = getServerConfig()

  if (!config.firebaseAdminConfigured) {
    console.error('[send-notification-email] Firebase Admin is not configured')

    return json(res, 503, {
      ok: false,
      sent: false,
      reason: 'firebase_admin_not_configured',
    })
  }

  if (!config.emailConfigured) {
    console.error('[send-notification-email] Email service is not configured')

    return json(res, 503, {
      ok: false,
      sent: false,
      reason: 'email_service_not_configured',
    })
  }

  const bearerToken = getBearerToken(req)

  if (!bearerToken) {
    return json(res, 401, {
      ok: false,
      sent: false,
      reason: 'missing_authorization',
    })
  }

  try {
    const adminApp = getAdminApp(config)
    const adminAuth = getAuth(adminApp)
    const db = getFirestore(adminApp)

    let caller

    try {
      caller = await adminAuth.verifyIdToken(bearerToken)
    } catch (error) {
      console.warn(
        '[send-notification-email] Firebase token verification failed:',
        error.message,
      )

      return json(res, 401, {
        ok: false,
        sent: false,
        reason: 'invalid_authorization',
      })
    }

    if (!caller?.uid) {
      return json(res, 401, {
        ok: false,
        sent: false,
        reason: 'invalid_authorization',
      })
    }

    // Do not email the actor themselves.
    if (caller.uid === recipientUid) {
      return json(res, 200, {
        ok: true,
        sent: false,
        reason: 'recipient_is_actor',
      })
    }

    const notificationRef = db
      .collection('notifications')
      .doc(notificationId)

    const notificationSnapshot = await notificationRef.get()

    if (!notificationSnapshot.exists) {
      return json(res, 404, {
        ok: false,
        sent: false,
        reason: 'notification_not_found',
      })
    }

    const notification = notificationSnapshot.data() || {}

    // The notification must belong to the requested recipient.
    if (notification.userId !== recipientUid) {
      return json(res, 403, {
        ok: false,
        sent: false,
        reason: 'notification_recipient_mismatch',
      })
    }

    // Only the actor who created the notification may trigger its email.
    if (notification.actorId !== caller.uid) {
      return json(res, 403, {
        ok: false,
        sent: false,
        reason: 'notification_actor_mismatch',
      })
    }

    if (sentNotificationIds.has(notificationId)) {
      return json(res, 200, {
        ok: true,
        sent: false,
        reason: 'already_sent',
      })
    }

    if (processingNotificationIds.has(notificationId)) {
      return json(res, 200, {
        ok: true,
        sent: false,
        reason: 'already_processing',
      })
    }

    processingNotificationIds.add(notificationId)

    try {
      const recipientProfileSnapshot = await db
        .collection('users')
        .doc(recipientUid)
        .get()

      if (!recipientProfileSnapshot.exists) {
        return json(res, 200, {
          ok: true,
          sent: false,
          reason: 'recipient_profile_not_found',
        })
      }

      const recipientProfile = recipientProfileSnapshot.data() || {}
      const recipientEmail = cleanText(recipientProfile.email)

      if (!isValidEmail(recipientEmail)) {
        return json(res, 200, {
          ok: true,
          sent: false,
          reason: 'recipient_email_not_found',
        })
      }

      const email = buildEmailContent(notification)
      const resend = new Resend(config.resendApiKey)

      const result = await resend.emails.send(
        {
          from: config.emailFrom,
          to: recipientEmail,
          subject: email.subject,
          text: email.text,
          html: email.html,
        },
        {
          idempotencyKey: `notification-email-${notificationId}`,
        },
      )

      if (result?.error) {
        console.error(
          '[send-notification-email] Resend returned an error:',
          result.error,
        )

        return json(res, 502, {
          ok: false,
          sent: false,
          reason: 'email_provider_error',
          providerError: result.error.message || 'Unknown Resend error',
        })
      }

      sentNotificationIds.add(notificationId)

      return json(res, 200, {
        ok: true,
        sent: true,
        emailId: result?.data?.id || null,
      })
    } finally {
      processingNotificationIds.delete(notificationId)
    }
  } catch (error) {
    console.error(
      '[send-notification-email] Unexpected server error:',
      error,
    )

    return json(res, 500, {
      ok: false,
      sent: false,
      reason: 'internal_server_error',
    })
  }
}