import { Resend } from 'resend'

const MAX_NAME_LENGTH = 200
const MAX_MESSAGE_LENGTH = 4000
const MAX_REQUEST_ID_LENGTH = 200
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').end(JSON.stringify(body))
}

function text(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { error: 'Method not allowed.' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return json(res, 400, { error: 'Invalid JSON body.' })
  }

  const recipientEmail = text(body?.recipientEmail, 320)
  const recipientName = text(body?.recipientName, MAX_NAME_LENGTH) || 'bạn'
  const senderName = text(body?.senderName, MAX_NAME_LENGTH)
  const messageText = text(body?.messageText, MAX_MESSAGE_LENGTH)
  const conversationId = text(body?.conversationId, 200)
  const requestId = text(body?.requestId, MAX_REQUEST_ID_LENGTH)

  if (!recipientEmail || !EMAIL_PATTERN.test(recipientEmail)) {
    return json(res, 400, { error: 'recipientEmail is required and must be a valid email.' })
  }
  if (!senderName || !messageText || !requestId) {
    return json(res, 400, { error: 'senderName, messageText and requestId are required.' })
  }
  if (!conversationId) {
    return json(res, 400, { error: 'conversationId is required.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM
  if (!apiKey || !emailFrom) {
    return json(res, 500, { error: 'Email service is not configured on the server.' })
  }

  const safeRecipientName = escapeHtml(recipientName)
  const safeSenderName = escapeHtml(senderName)
  const safeMessage = escapeHtml(messageText)
  const subject = `AQUA - Bạn có tin nhắn mới từ ${senderName}`
  const html = `
    <!doctype html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AQUA - Thông báo tin nhắn mới</title>
      </head>
      <body>
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <p>Xin chào ${safeRecipientName},</p>
          <p>Bạn có một tin nhắn mới trên hệ thống AQUA từ <strong>${safeSenderName}</strong>:</p>
          <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 4px solid #2563eb; background: #f3f4f6; white-space: pre-wrap;">${safeMessage}</blockquote>
          <p>Vui lòng đăng nhập AQUA để xem và trả lời tin nhắn.</p>
        </div>
      </body>
    </html>
  `
  const plainText = [
    `Xin chào ${recipientName},`,
    '',
    `Bạn có một tin nhắn mới trên hệ thống AQUA từ ${senderName}:`,
    '',
    messageText,
    '',
    'Vui lòng đăng nhập AQUA để xem và trả lời tin nhắn.',
  ].join('\n')

  try {
    const resend = new Resend(apiKey)
    const result = await resend.emails.send(
      {
        from: emailFrom,
        to: recipientEmail,
        subject,
        html,
        text: plainText,
        headers: {
          'X-AQUA-Conversation-Id': conversationId,
        },
      },
      { idempotencyKey: requestId },
    )

    if (result.error) {
      return json(res, 502, { error: 'Email provider rejected the request.' })
    }

    return json(res, 200, { ok: true, id: result.data?.id ?? null })
  } catch {
    return json(res, 502, { error: 'Email delivery failed.' })
  }
}
