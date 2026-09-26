import { getUserDepartmentIds } from '../services/userService'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidEmail(email) {
  return typeof email === 'string' && EMAIL_PATTERN.test(email.trim())
}

function recipientFromProfile(profile) {
  if (!profile?.id || !isValidEmail(profile.email)) return null
  return {
    uid: profile.id,
    displayName: profile.displayName?.trim() || profile.email.split('@')[0] || 'Người dùng',
    email: profile.email.trim(),
  }
}

export function resolveEmailRecipients({ mode, profiles, assignedUid, departmentId, actorUid }) {
  let candidates = []

  if (mode === 'assignee') {
    candidates = profiles.filter((profile) => profile.id === assignedUid)
  } else if (mode === 'department') {
    if (!departmentId) return []
    candidates = profiles.filter((profile) => getUserDepartmentIds(profile).includes(departmentId))
  } else if (mode === 'all') {
    candidates = profiles
  }

  const byUid = new Map()
  const seenEmails = new Set()

  candidates.forEach((profile) => {
    if (profile.id === actorUid) return
    const recipient = recipientFromProfile(profile)
    if (!recipient || byUid.has(recipient.uid)) return

    const normalizedEmail = recipient.email.toLowerCase()
    if (seenEmails.has(normalizedEmail)) return

    seenEmails.add(normalizedEmail)
    byUid.set(recipient.uid, recipient)
  })

  return [...byUid.values()]
}
