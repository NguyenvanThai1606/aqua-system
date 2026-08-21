import { useEffect, useRef, useState } from 'react'
import Avatar from '../Avatar'
import Icon from '../Icon'
import {
  formatMessageTime,
  getConversationAvatarProps,
  getConversationTitle,
  isGroupConversation,
} from '../../utils/messageUtils'
import cx from '../../utils/cx'

export default function ConversationThread({
  conversation,
  messages,
  loading,
  currentUid,
  onSend,
  sending,
  onBack,
  showBack = false,
  onOpenGroupInfo,
}) {
  const [draft, setDraft] = useState('')
  const scrollRef = useRef(null)
  const isGroup = isGroupConversation(conversation)
  const title = getConversationTitle(conversation, currentUid)
  const avatarProps = getConversationAvatarProps(conversation, currentUid)
  const other = isGroup ? null : conversation?.participants?.find((person) => person.id !== currentUid)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, conversation?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending) return

    setDraft('')
    try {
      await onSend(text)
    } catch {
      setDraft(text)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit(event)
    }
  }

  return (
    <div className="conversation-thread">
      <header className="conversation-thread-header">
        {showBack && (
          <button type="button" className="icon-btn" onClick={onBack} aria-label="Quay lại danh sách">
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        <Avatar {...avatarProps} size="md" />
        <div className="conversation-thread-title">
          <p className="conversation-thread-name">{title}</p>
          {isGroup ? (
            <p className="conversation-thread-email muted">
              {conversation.participants?.length ?? 0} thành viên
            </p>
          ) : (
            other?.email && <p className="conversation-thread-email muted">{other.email}</p>
          )}
        </div>

        {isGroup && onOpenGroupInfo && (
          <button
            type="button"
            className="icon-btn conversation-thread-info-btn"
            onClick={onOpenGroupInfo}
            aria-label="Thông tin nhóm"
            title="Thông tin nhóm"
          >
            <Icon name="info" size={18} />
          </button>
        )}
      </header>

      <div className="conversation-thread-messages" ref={scrollRef}>
        {loading && <p className="conversation-state muted">Đang tải tin nhắn…</p>}

        {!loading && messages.length === 0 && (
          <p className="conversation-state muted">Chưa có tin nhắn nào — hãy bắt đầu cuộc trò chuyện.</p>
        )}

        {!loading &&
          messages.map((message) => {
            const isMine = message.senderId === currentUid
            const senderName = isGroup
              ? conversation?.participants?.find((person) => person.id === message.senderId)?.name
              : null

            return (
              <div key={message.id} className={cx('message-row', isMine && 'message-row-mine')}>
                <div className={cx('message-bubble', isMine && 'message-bubble-mine')}>
                  {!isMine && senderName && <p className="message-sender">{senderName}</p>}
                  <p className="message-text">{message.text}</p>
                  <span className="message-time">{formatMessageTime(message.createdAt)}</span>
                </div>
              </div>
            )
          })}
      </div>

      <form className="conversation-composer" onSubmit={handleSubmit}>
        <textarea
          className="textarea conversation-composer-input"
          placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          aria-label="Nhập tin nhắn"
        />
        <button type="submit" className="btn btn-primary conversation-send-btn" disabled={!draft.trim() || sending}>
          <Icon name="send" size={16} className="conversation-send-icon" />
          Gửi
        </button>
      </form>
    </div>
  )
}
