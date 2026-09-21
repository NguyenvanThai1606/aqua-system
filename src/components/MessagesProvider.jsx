import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessagesContext } from '../utils/messagesContext'
import { useAuth } from '../utils/authContext'
import { useNotifications } from '../utils/notificationsContext'
import { toPersonRef } from '../services/userService'
import * as messageService from '../services/messageService'

/**
 * Kho cuộc trò chuyện dùng chung cho trang /tin-nhan VÀ badge số tin chưa
 * đọc ở Sidebar (`badgeKey: 'unreadMessages'`, xem `layouts/Sidebar.jsx`)
 * — cùng lý do EventsProvider được đặt ở App.jsx thay vì local state
 * riêng của MessagesPage: badge sidebar cần thấy số chưa đọc ở MỌI trang,
 * không chỉ khi đang mở /tin-nhan.
 *
 * Nội dung tin nhắn của TỪNG cuộc trò chuyện (subcollection `messages`)
 * KHÔNG tải ở đây — chỉ tải khi user thực sự mở một cuộc trò chuyện cụ
 * thể (xem `pages/MessagesPage.jsx`), tránh subscribe hàng chục
 * subcollection cùng lúc chỉ để tính badge.
 */
export default function MessagesProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { notify } = useNotifications()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      setConversations([])
      setLoading(true)
      return undefined
    }

    if (!user) {
      setConversations([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const unsubscribe = messageService.subscribeConversations(user.uid, (list) => {
      setConversations(list)
      setLoading(false)
    })

    return unsubscribe
  }, [authLoading, user])

  const startConversation = useCallback(
    async (otherProfile) => {
      if (!user) throw new Error('Bạn cần đăng nhập để nhắn tin.')

      const me = toPersonRef({
        id: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      })

      return messageService.getOrCreateDirectConversation(me, otherProfile)
    },
    [user],
  )

  const markRead = useCallback((conversationId) => {
    if (!user) return Promise.resolve()
    return messageService.markConversationRead(conversationId, user.uid)
  }, [user])

  // ---- Chat nhóm (Phase 12.x) ----------------------------------------
  // Quyền admin thật sự vẫn được enforce ở Firestore Rules — các hàm này
  // chỉ gọi thẳng service, KHÔNG tự kiểm tra role ở đây để tránh hai nơi
  // "nguồn sự thật" cho cùng một quyền (UI đã ẩn nút cho user thường ở
  // MessagesPage/ConversationList/ConversationThread).

  /** [Phase 14] Báo cho MỖI thành viên MỚI (trừ chính người đang thao tác). */
  const notifyGroupAdded = useCallback(
    (conversation, members) => {
      if (!user) return
      members?.forEach((member) => {
        if (!member?.id || member.id === user.uid) return
        notify({
          userId: member.id,
          type: 'group_added',
          title: 'Bạn được thêm vào một nhóm chat',
          message: conversation.name,
          relatedType: 'conversation',
          relatedId: conversation.id,
          actorId: user.uid,
          actorName: user.displayName || user.email || null,
        }).catch((error) => console.error('[MessagesProvider] Không gửi được thông báo thêm nhóm:', error))
      })
    },
    [user, notify],
  )

  const createGroup = useCallback(
    async ({ name, description, photoURL, members }) => {
      if (!user) throw new Error('Bạn cần đăng nhập để tạo nhóm.')

      const creator = toPersonRef({
        id: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      })

      const conversation = await messageService.createGroupConversation({
        creator,
        name,
        description,
        photoURL,
        members,
      })
      notifyGroupAdded(conversation, members)
      return conversation
    },
    [user, notifyGroupAdded],
  )

  const updateGroup = useCallback((conversationId, patch) => {
    return messageService.updateGroupConversation(conversationId, patch)
  }, [])

  const addGroupMembers = useCallback(
    async (conversation, members) => {
      const result = await messageService.addGroupParticipants(conversation, members)
      notifyGroupAdded(conversation, members)
      return result
    },
    [notifyGroupAdded],
  )

  const removeGroupMember = useCallback((conversation, uid) => {
    return messageService.removeGroupParticipant(conversation, uid)
  }, [])

  const unreadTotal = useMemo(() => {
    if (!user) return 0
    return conversations.reduce((sum, conversation) => sum + (conversation.unreadCounts?.[user.uid] ?? 0), 0)
  }, [conversations, user])

  const value = useMemo(
    () => ({
      conversations,
      loading,
      unreadTotal,
      startConversation,
      markRead,
      createGroup,
      updateGroup,
      addGroupMembers,
      removeGroupMember,
    }),
    [
      conversations,
      loading,
      unreadTotal,
      startConversation,
      markRead,
      createGroup,
      updateGroup,
      addGroupMembers,
      removeGroupMember,
    ],
  )

  return <MessagesContext value={value}>{children}</MessagesContext>
}
