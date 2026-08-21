import { useMemo, useState } from 'react'
import Avatar from '../Avatar'
import Icon from '../Icon'
import {
  formatConversationTime,
  getConversationAvatarProps,
  getConversationTitle,
  isGroupConversation,
  truncate,
  unreadCountOf,
} from '../../utils/messageUtils'
import cx from '../../utils/cx'

/**
 * Danh sách cuộc trò chuyện bên trái — tìm kiếm theo tên người còn lại
 * (1–1) hoặc tên nhóm (group), hoặc nội dung tin nhắn cuối.
 *
 * `isAdmin`/`onNewGroup` là tùy chọn (Phase 12.x) — khi có, hiển thị
 * thêm nút "Tạo nhóm" bên cạnh nút "Nhắn tin mới" sẵn có. User thường
 * (không truyền `isAdmin`/`onNewGroup`) thấy giao diện y hệt trước đây.
 */
export default function ConversationList({
  conversations,
  loading,
  activeId,
  onSelect,
  currentUid,
  onNewConversation,
  isAdmin = false,
  onNewGroup,
}) {
  const [keyword, setKeyword] = useState('')

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return conversations

    return conversations.filter((conversation) => {
      const title = getConversationTitle(conversation, currentUid)
      const other = isGroupConversation(conversation)
        ? null
        : conversation.participants?.find((person) => person.id !== currentUid)
      const haystack = `${title} ${other?.email ?? ''} ${conversation.lastMessage?.text ?? ''}`
      return haystack.toLowerCase().includes(q)
    })
  }, [conversations, keyword, currentUid])

  return (
    <div className="conversation-list">
      <div className="conversation-list-head">
        <div className="conversation-search">
          <Icon name="search" size={15} className="conversation-search-icon" />
          <input
            type="search"
            className="conversation-search-input"
            placeholder="Tìm cuộc trò chuyện…"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Tìm cuộc trò chuyện"
          />
        </div>

        <button
          type="button"
          className="icon-btn"
          onClick={onNewConversation}
          aria-label="Nhắn tin mới"
          title="Nhắn tin mới"
        >
          <Icon name="plus" size={18} />
        </button>

        {isAdmin && onNewGroup && (
          <button
            type="button"
            className="icon-btn"
            onClick={onNewGroup}
            aria-label="Tạo nhóm"
            title="Tạo nhóm"
          >
            <Icon name="employees" size={18} />
          </button>
        )}
      </div>

      <div className="conversation-items">
        {loading && <p className="conversation-state muted">Đang tải cuộc trò chuyện…</p>}

        {!loading && filtered.length === 0 && (
          <p className="conversation-state muted">
            {conversations.length === 0 ? 'Chưa có cuộc trò chuyện nào.' : 'Không tìm thấy kết quả phù hợp.'}
          </p>
        )}

        {filtered.map((conversation) => {
          const title = getConversationTitle(conversation, currentUid)
          const avatarProps = getConversationAvatarProps(conversation, currentUid)
          const unread = unreadCountOf(conversation, currentUid)
          const isMine = conversation.lastMessage?.senderId === currentUid
          const isGroup = isGroupConversation(conversation)

          return (
            <button
              key={conversation.id}
              type="button"
              className={cx('conversation-item', conversation.id === activeId && 'conversation-item-active')}
              onClick={() => onSelect(conversation.id)}
            >
              <Avatar {...avatarProps} size="md" />

              <span className="conversation-item-body">
                <span className="conversation-item-row">
                  <span className="conversation-item-name">
                    {isGroup && <Icon name="employees" size={13} className="conversation-item-group-icon" />}
                    {title}
                  </span>
                  <span className="conversation-item-time">{formatConversationTime(conversation.lastMessageAt)}</span>
                </span>
                <span className="conversation-item-row">
                  <span className={cx('conversation-item-snippet', unread > 0 && 'conversation-item-snippet-unread')}>
                    {conversation.lastMessage
                      ? `${isMine ? 'Bạn: ' : ''}${truncate(conversation.lastMessage.text, 42)}`
                      : 'Chưa có tin nhắn'}
                  </span>
                  {unread > 0 && <span className="conversation-unread-badge">{unread > 9 ? '9+' : unread}</span>}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
