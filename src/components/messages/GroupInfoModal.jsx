import { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import ConfirmDialog from '../ConfirmDialog'
import Avatar from '../Avatar'
import Icon from '../Icon'
import useUserProfiles from '../../utils/useUserProfiles'
import { toPersonRef } from '../../services/userService'
import cx from '../../utils/cx'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

/**
 * Modal "Thông tin nhóm" — mọi participant xem được danh sách thành
 * viên (+ mô tả/ảnh nhóm nếu có); CHỈ admin (và đang là participant —
 * luôn đúng vì modal chỉ mở được từ trong chính conversation) mới thấy
 * các thao tác quản lý (đổi tên/mô tả/ảnh, thêm/xóa thành viên). Quyền
 * thật sự vẫn được Firestore Rules chốt lại — đây chỉ là ẩn/hiện UI.
 */
export default function GroupInfoModal({
  open,
  onClose,
  conversation,
  currentUid,
  canManage,
  onSave,
  onAddMembers,
  onRemoveMember,
}) {
  const [mode, setMode] = useState('view') // 'view' | 'edit' | 'add'
  const [nameDraft, setNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [photoURLDraft, setPhotoURLDraft] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [pendingRemoveId, setPendingRemoveId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const { profiles, loading } = useUserProfiles(open && mode === 'add')

  useEffect(() => {
    if (!open) {
      setMode('view')
      setNameDraft('')
      setDescriptionDraft('')
      setPhotoURLDraft('')
      setKeyword('')
      setSelectedIds([])
      setPendingRemoveId(null)
      setError('')
    }
  }, [open])

  useEffect(() => {
    if (mode === 'edit') {
      setNameDraft(conversation?.name ?? '')
      setDescriptionDraft(conversation?.description ?? '')
      setPhotoURLDraft(conversation?.photoURL ?? '')
    }
  }, [mode, conversation?.name, conversation?.description, conversation?.photoURL])

  const memberIds = useMemo(
    () => new Set((conversation?.participants ?? []).map((person) => person.id)),
    [conversation],
  )

  const addableProfiles = useMemo(
    () => profiles.filter((profile) => !memberIds.has(profile.id)),
    [profiles, memberIds],
  )

  const addResults = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return addableProfiles
    return addableProfiles.filter((profile) => {
      const haystack = `${profile.displayName ?? ''} ${profile.email ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [addableProfiles, keyword])

  if (!conversation) return null

  const members = conversation.participants ?? []

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleSave = async (event) => {
    event.preventDefault()
    const trimmedName = nameDraft.trim()
    if (!trimmedName) {
      setError('Tên nhóm không được để trống.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({ name: trimmedName, description: descriptionDraft, photoURL: photoURLDraft })
      setMode('view')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu thay đổi.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddMembers = async () => {
    if (selectedIds.length === 0) return
    const newMembers = addableProfiles
      .filter((profile) => selectedIds.includes(profile.id))
      .map((profile) => toPersonRef(profile))

    setSaving(true)
    setError('')
    try {
      await onAddMembers(newMembers)
      setMode('view')
      setSelectedIds([])
      setKeyword('')
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Không thể thêm thành viên.')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!pendingRemoveId) return
    setSaving(true)
    setError('')
    try {
      await onRemoveMember(pendingRemoveId)
      setPendingRemoveId(null)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không thể xóa thành viên.')
    } finally {
      setSaving(false)
    }
  }

  const pendingRemoveProfile = members.find((person) => person.id === pendingRemoveId)

  return (
    <>
      <Modal
        open={open && !pendingRemoveId}
        onClose={onClose}
        size="sm"
        title={mode === 'view' ? conversation.name : mode === 'edit' ? 'Chỉnh sửa nhóm' : 'Thêm thành viên'}
        description={mode === 'view' ? `${members.length} thành viên` : undefined}
      >
        {mode === 'view' && (
          <div className="group-info">
            <div className="group-info-header">
              <Avatar name={conversation.name} photoURL={conversation.photoURL} size="lg" />
              {conversation.description && <p className="group-info-description">{conversation.description}</p>}
            </div>

            <div className="group-info-members">
              {members.map((person) => {
                const isCreator = person.id === conversation.createdBy
                return (
                  <div key={person.id} className="group-info-member">
                    <Avatar name={person.name} photoURL={person.photoURL} initials={person.initials} size="md" />
                    <span className="group-info-member-info">
                      <span className="group-info-member-name">
                        {person.name}
                        {person.id === currentUid && <span className="muted"> (bạn)</span>}
                      </span>
                      {person.email && <span className="group-info-member-email muted">{person.email}</span>}
                    </span>
                    <span className={cx('group-info-role', isCreator && 'group-info-role-admin')}>
                      {isCreator ? 'Admin' : 'Thành viên'}
                    </span>
                    {canManage && !isCreator && (
                      <button
                        type="button"
                        className="icon-btn group-info-remove-btn"
                        onClick={() => setPendingRemoveId(person.id)}
                        aria-label={`Xóa ${person.name} khỏi nhóm`}
                        title="Xóa khỏi nhóm"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {canManage && (
              <div className="group-info-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setMode('edit')}>
                  Quản lý nhóm
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setMode('add')}>
                  <Icon name="plus" size={14} />
                  Thêm thành viên
                </button>
              </div>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <form className="group-info-form" onSubmit={handleSave}>
            <div className="field">
              <label className="field-label" htmlFor="group-rename-input">
                Tên nhóm
              </label>
              <input
                id="group-rename-input"
                type="text"
                className="input"
                value={nameDraft}
                maxLength={MAX_NAME_LENGTH}
                onChange={(event) => setNameDraft(event.target.value)}
                autoFocus
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="group-description-edit-input">
                Mô tả <span className="muted">(không bắt buộc)</span>
              </label>
              <textarea
                id="group-description-edit-input"
                className="textarea"
                rows={2}
                value={descriptionDraft}
                maxLength={MAX_DESCRIPTION_LENGTH}
                onChange={(event) => setDescriptionDraft(event.target.value)}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="group-photo-edit-input">
                Link ảnh đại diện nhóm <span className="muted">(không bắt buộc)</span>
              </label>
              <input
                id="group-photo-edit-input"
                type="url"
                className="input"
                placeholder="https://…"
                value={photoURLDraft}
                onChange={(event) => setPhotoURLDraft(event.target.value)}
              />
            </div>

            {error && <p className="create-group-error">{error}</p>}

            <div className="create-group-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setMode('view')} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}

        {mode === 'add' && (
          <div className="group-info-form">
            <input
              type="search"
              className="input"
              placeholder="Tìm theo tên hoặc email…"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              autoFocus
              aria-label="Tìm nhân viên để thêm vào nhóm"
            />

            <div className="new-conversation-results create-group-results">
              {loading && <p className="conversation-state muted">Đang tải danh sách người dùng…</p>}

              {!loading && addResults.length === 0 && (
                <p className="conversation-state muted">Không còn ai để thêm.</p>
              )}

              {addResults.map((profile) => {
                const checked = selectedIds.includes(profile.id)
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={cx('new-conversation-row', checked && 'new-conversation-row-checked')}
                    onClick={() => toggleSelected(profile.id)}
                  >
                    <span className={cx('create-group-checkbox', checked && 'create-group-checkbox-checked')}>
                      {checked && <Icon name="check" size={12} />}
                    </span>
                    <Avatar name={profile.displayName} photoURL={profile.photoURL} size="md" />
                    <span className="new-conversation-info">
                      <span className="new-conversation-name">{profile.displayName || 'Người dùng'}</span>
                      {profile.email && <span className="new-conversation-email muted">{profile.email}</span>}
                    </span>
                  </button>
                )
              })}
            </div>

            {error && <p className="create-group-error">{error}</p>}

            <div className="create-group-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setMode('view')
                  setSelectedIds([])
                  setKeyword('')
                }}
                disabled={saving}
              >
                Hủy
              </button>
              <button type="button" className="btn btn-primary" onClick={handleAddMembers} disabled={saving || selectedIds.length === 0}>
                {saving ? 'Đang thêm…' : `Thêm (${selectedIds.length})`}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingRemoveId)}
        onClose={() => setPendingRemoveId(null)}
        onConfirm={handleConfirmRemove}
        title="Xóa thành viên khỏi nhóm?"
        description={
          pendingRemoveProfile
            ? `${pendingRemoveProfile.name} sẽ không còn thấy hoặc gửi tin nhắn trong nhóm này.`
            : undefined
        }
        confirmLabel="Xóa khỏi nhóm"
        tone="danger"
        busy={saving}
      />
    </>
  )
}
