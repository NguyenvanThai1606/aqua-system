import { useEffect, useMemo, useState } from 'react'
import Modal from '../Modal'
import Avatar from '../Avatar'
import Icon from '../Icon'
import useUserProfiles from '../../utils/useUserProfiles'
import { toPersonRef } from '../../services/userService'
import cx from '../../utils/cx'

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

/**
 * Modal "Tạo nhóm" — CHỈ hiển thị cho admin (kiểm soát ở MessagesPage).
 * Nhập tên nhóm + chọn nhiều nhân viên theo tên/email. Người tạo (admin
 * hiện tại) LUÔN tự động là thành viên — không hiển thị trong danh sách
 * để chọn vì không cần tự chọn chính mình.
 */
export default function CreateGroupModal({ open, onClose, onCreate, currentUid, creating }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [photoURL, setPhotoURL] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const [error, setError] = useState('')
  const { profiles, loading } = useUserProfiles(open)

  useEffect(() => {
    if (!open) {
      setName('')
      setDescription('')
      setPhotoURL('')
      setKeyword('')
      setSelectedIds([])
      setError('')
    }
  }, [open])

  const others = useMemo(() => profiles.filter((profile) => profile.id !== currentUid), [profiles, currentUid])

  const results = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    if (!q) return others
    return others.filter((profile) => {
      const haystack = `${profile.displayName ?? ''} ${profile.email ?? ''}`.toLowerCase()
      return haystack.includes(q)
    })
  }, [others, keyword])

  const selectedProfiles = useMemo(
    () => others.filter((profile) => selectedIds.includes(profile.id)),
    [others, selectedIds],
  )

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Vui lòng nhập tên nhóm.')
      return
    }
    if (selectedIds.length === 0) {
      setError('Chọn ít nhất 1 thành viên cho nhóm.')
      return
    }

    setError('')
    try {
      await onCreate({
        name: trimmedName,
        description,
        photoURL,
        members: selectedProfiles.map((profile) => toPersonRef(profile)),
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể tạo nhóm.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Tạo nhóm"
      description="Đặt tên nhóm và chọn nhân viên muốn thêm vào."
    >
      <form className="create-group" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="group-name-input">
            Tên nhóm
          </label>
          <input
            id="group-name-input"
            type="text"
            className="input"
            placeholder="Ví dụ: Phòng Kinh doanh"
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="group-description-input">
            Mô tả <span className="muted">(không bắt buộc)</span>
          </label>
          <textarea
            id="group-description-input"
            className="textarea"
            rows={2}
            placeholder="Nhóm này dùng để trao đổi việc gì?"
            value={description}
            maxLength={MAX_DESCRIPTION_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="group-photo-input">
            Link ảnh đại diện nhóm <span className="muted">(không bắt buộc)</span>
          </label>
          <input
            id="group-photo-input"
            type="url"
            className="input"
            placeholder="https://…"
            value={photoURL}
            onChange={(event) => setPhotoURL(event.target.value)}
          />
        </div>

        {selectedProfiles.length > 0 && (
          <div className="create-group-selected">
            {selectedProfiles.map((profile) => (
              <span key={profile.id} className="create-group-chip">
                <Avatar name={profile.displayName} photoURL={profile.photoURL} size="sm" />
                {profile.displayName || profile.email || 'Người dùng'}
                <button
                  type="button"
                  className="create-group-chip-remove"
                  onClick={() => toggleSelected(profile.id)}
                  aria-label={`Bỏ chọn ${profile.displayName || 'người dùng'}`}
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="search"
          className="input"
          placeholder="Tìm theo tên hoặc email…"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          aria-label="Tìm nhân viên để thêm vào nhóm"
        />

        <div className="new-conversation-results create-group-results">
          {loading && <p className="conversation-state muted">Đang tải danh sách người dùng…</p>}

          {!loading && results.length === 0 && (
            <p className="conversation-state muted">Không tìm thấy người dùng phù hợp.</p>
          )}

          {results.map((profile) => {
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
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={creating}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Đang tạo…' : 'Tạo nhóm'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
