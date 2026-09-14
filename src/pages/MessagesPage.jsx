import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ConversationList from '../components/messages/ConversationList'
import ConversationThread from '../components/messages/ConversationThread'
import NewConversationModal from '../components/messages/NewConversationModal'
import CreateGroupModal from '../components/messages/CreateGroupModal'
import GroupInfoModal from '../components/messages/GroupInfoModal'
import Icon from '../components/Icon'
import { useMessages } from '../utils/messagesContext'
import { useAuth } from '../utils/authContext'
import { useToast } from '../utils/toastContext'
import useMediaQuery from '../utils/useMediaQuery'
import { isGroupConversation } from '../utils/messageUtils'
import * as messageService from '../services/messageService'
import '../styles/messages.css'

export default function MessagesPage() {
  const { user, isAdmin } = useAuth()
  const {
    conversations,
    loading,
    startConversation,
    markRead,
    createGroup,
    updateGroup,
    addGroupMembers,
    removeGroupMember,
  } = useMessages()
  const toast = useToast()
  const isDesktop = useMediaQuery('(min-width: 900px)')

  const [activeId, setActiveId] = useState(null)
  const [pendingConversation, setPendingConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupInfoOpen, setGroupInfoOpen] = useState(false)

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeId) ??
    (pendingConversation?.id === activeId ? pendingConversation : null)

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return undefined
    }

    setMessagesLoading(true)
    const unsubscribe = messageService.subscribeMessages(activeId, (list) => {
      setMessages(list)
      setMessagesLoading(false)
    })

    return unsubscribe
  }, [activeId, user?.uid])

  useEffect(() => {
    setActiveId(null)
    setPendingConversation(null)
    setMessages([])
    setMessagesLoading(false)
  }, [user?.uid])

  // Tin nhắn mới của người kia tới trong lúc đang mở cuộc trò chuyện này
  // → đánh dấu đã đọc ngay, không đợi user rời trang rồi quay lại.
  useEffect(() => {
    if (!activeId || !activeConversation || !user) return
    const unread = activeConversation.unreadCounts?.[user.uid] ?? 0
    if (unread > 0) markRead(activeId)
  }, [activeId, activeConversation, user, markRead])

  const handleSelect = (id) => {
    setActiveId(id)
  }

  const handleBack = () => setActiveId(null)

  const handleSend = async (text, sendEmail = false) => {
    if (!activeConversation || !user) return
    setSending(true)
    try {
      const sentMessage = await messageService.sendMessage({
        conversationId: activeConversation.id,
        participantIds: activeConversation.participantIds,
        senderId: user.uid,
        text,
        sendEmail,
      })

      if (sendEmail) {
        const recipients = (activeConversation.participants ?? []).filter(
          (participant) => participant.id !== user.uid,
        )
        const emailResults = recipients.length
          ? await Promise.allSettled(
              recipients.map(async (recipient) => {
                if (!recipient.email) throw new Error(`Không có email của ${recipient.name || 'người nhận'}.`)

                const response = await fetch('/api/send-message-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    recipientEmail: recipient.email,
                    recipientName: recipient.name,
                    senderName: user.displayName || user.email || 'Người dùng AQUA',
                    messageText: text,
                    conversationId: activeConversation.id,
                    requestId: `message-email-${sentMessage.id}-${recipient.id}`,
                  }),
                })

                if (!response.ok) throw new Error('Email service request failed.')
              }),
            )
          : [{ status: 'rejected' }]

        if (emailResults.some((result) => result.status === 'rejected')) {
          toast.warning('Tin nhắn đã được gửi nhưng thông báo email không gửi được.')
        }
      }
    } catch (error) {
      toast.error('Không gửi được tin nhắn', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
      throw error
    } finally {
      setSending(false)
    }
  }

  const handleSelectUser = async (otherProfile) => {
    setStarting(true)
    try {
      const conversation = await startConversation(otherProfile)
      setPendingConversation(conversation)
      setActiveId(conversation.id)
      setNewModalOpen(false)
    } catch (error) {
      toast.error('Không thể bắt đầu cuộc trò chuyện', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
    } finally {
      setStarting(false)
    }
  }

  const handleCreateGroup = async ({ name, description, photoURL, members }) => {
    setCreatingGroup(true)
    try {
      const conversation = await createGroup({ name, description, photoURL, members })
      setPendingConversation(conversation)
      setActiveId(conversation.id)
      setGroupModalOpen(false)
    } catch (error) {
      toast.error('Không thể tạo nhóm', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
      throw error
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleUpdateGroup = async (patch) => {
    if (!activeConversation) return
    try {
      await updateGroup(activeConversation.id, patch)
    } catch (error) {
      toast.error('Không thể lưu thay đổi nhóm', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
      throw error
    }
  }

  const handleAddGroupMembers = async (members) => {
    if (!activeConversation) return
    try {
      await addGroupMembers(activeConversation, members)
    } catch (error) {
      toast.error('Không thể thêm thành viên', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
      throw error
    }
  }

  const handleRemoveGroupMember = async (uid) => {
    if (!activeConversation) return
    try {
      await removeGroupMember(activeConversation, uid)
    } catch (error) {
      toast.error('Không thể xóa thành viên', {
        message: error instanceof Error ? error.message : 'Vui lòng thử lại.',
      })
      throw error
    }
  }

  const showList = !isDesktop ? !activeId : true
  const showThread = !isDesktop ? Boolean(activeId) : true
  const activeIsGroup = isGroupConversation(activeConversation)
  const canManageActiveGroup = activeIsGroup && isAdmin

  return (
    <>
      <PageHeader
        icon="messages"
        title="Tin nhắn"
        description="Trao đổi 1–1 và theo nhóm với đồng nghiệp trong nội bộ."
      />

      <div className="messages-page">
        {showList && (
          <ConversationList
            conversations={conversations}
            loading={loading}
            activeId={activeId}
            onSelect={handleSelect}
            currentUid={user?.uid}
            onNewConversation={() => setNewModalOpen(true)}
            isAdmin={isAdmin}
            onNewGroup={() => setGroupModalOpen(true)}
          />
        )}

        {showThread &&
          (activeConversation ? (
            <ConversationThread
              conversation={activeConversation}
              messages={messages}
              loading={messagesLoading}
              currentUid={user?.uid}
              onSend={handleSend}
              sending={sending}
              onBack={handleBack}
              showBack={!isDesktop}
              onOpenGroupInfo={activeIsGroup ? () => setGroupInfoOpen(true) : undefined}
            />
          ) : (
            <div className="messages-empty">
              <span className="messages-empty-icon">
                <Icon name="messages" size={26} />
              </span>
              <p className="messages-empty-title">Chọn một cuộc trò chuyện</p>
              <p className="messages-empty-description muted">
                Chọn một cuộc trò chuyện ở danh sách bên trái, hoặc bắt đầu cuộc trò chuyện mới.
              </p>
              <div className="messages-empty-actions">
                <button type="button" className="btn btn-primary" onClick={() => setNewModalOpen(true)}>
                  <Icon name="plus" size={16} />
                  Nhắn tin mới
                </button>
                {isAdmin && (
                  <button type="button" className="btn btn-secondary" onClick={() => setGroupModalOpen(true)}>
                    <Icon name="employees" size={16} />
                    Tạo nhóm
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      <NewConversationModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSelectUser={handleSelectUser}
        currentUid={user?.uid}
        starting={starting}
      />

      {isAdmin && (
        <CreateGroupModal
          open={groupModalOpen}
          onClose={() => setGroupModalOpen(false)}
          onCreate={handleCreateGroup}
          currentUid={user?.uid}
          creating={creatingGroup}
        />
      )}

      {activeIsGroup && (
        <GroupInfoModal
          open={groupInfoOpen}
          onClose={() => setGroupInfoOpen(false)}
          conversation={activeConversation}
          currentUid={user?.uid}
          canManage={canManageActiveGroup}
          onSave={handleUpdateGroup}
          onAddMembers={handleAddGroupMembers}
          onRemoveMember={handleRemoveGroupMember}
        />
      )}
    </>
  )
}
