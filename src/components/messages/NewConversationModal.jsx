import { useMemo, useState } from 'react'
import Modal from '../Modal'
import Avatar from '../Avatar'
import useUserProfiles from '../../utils/useUserProfiles'
import { toPersonRef } from '../../services/userService'

/** Tìm nhân viên theo tên/email rồi bắt đầu (hoặc mở lại) một cuộc trò chuyện 1–1. */
export default function NewConversationModal({ open, onClose, onSelectUser, currentUid, starting }) {
  const [keyword, setKeyword] = useState('')
  const { profiles, loading } = useUserProfiles(open)

  const results = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    const others = profiles.filter((profile) => profile.id !== currentUid)
    if (!q) return others

    return others.filter((profile) => {
      const haystack = `${profile.displayName ?? ''} ${profile.email ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [profiles, keyword, currentUid])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Nhắn tin mới"
      description="Tìm nhân viên theo tên hoặc email để bắt đầu trò chuyện."
    >
      <div className="new-conversation">
        <input
          type="search"
          className="input"
          placeholder="Tìm theo tên hoặc email…"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          autoFocus
          aria-label="Tìm nhân viên"
        />

        <div className="new-conversation-results">
          {loading && <p className="conversation-state muted">Đang tải danh sách người dùng…</p>}

          {!loading && results.length === 0 && (
            <p className="conversation-state muted">Không tìm thấy người dùng phù hợp.</p>
          )}

          {results.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className="new-conversation-row"
              disabled={starting}
              onClick={() => onSelectUser(toPersonRef(profile))}
            >
              <Avatar name={profile.displayName} photoURL={profile.photoURL} size="md" />
              <span className="new-conversation-info">
                <span className="new-conversation-name">{profile.displayName || 'Người dùng'}</span>
                {profile.email && <span className="new-conversation-email muted">{profile.email}</span>}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
