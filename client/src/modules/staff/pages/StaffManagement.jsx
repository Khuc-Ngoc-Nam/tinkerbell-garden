import { useEffect, useMemo, useState } from 'react'
import { request } from '../../../services/api'
import './StaffManagement.css'

const blankForm = {
  fullName: '',
  username: '',
  password: '',
  cccd: '',
}

function passwordText(staff) {
  return staff.passwordLabel || 'Đã mã hóa'
}

export default function StaffManagement() {
  const [staffList, setStaffList] = useState([])
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const formTitle = editingId ? 'Sửa thông tin nhân viên' : 'Thêm thông tin nhân viên'
  const sortedStaff = useMemo(
    () => [...staffList].sort((a, b) => String(a.fullName).localeCompare(String(b.fullName), 'vi')),
    [staffList],
  )

  async function loadStaff() {
    setStaffList(await request('get', '/staff'))
  }

  useEffect(() => {
    loadStaff().catch((error) => setMessage(error.message))
  }, [])

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function resetForm() {
    setForm(blankForm)
    setEditingId(null)
    setShowPassword(false)
  }

  function editStaff(staff) {
    setEditingId(staff.id)
    setForm({
      fullName: staff.fullName || '',
      username: staff.username || '',
      password: '',
      cccd: staff.cccd || '',
    })
    setMessage('Đang sửa nhân viên. Nếu không đổi mật khẩu, hãy để trống ô password.')
  }

  async function submit(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const payload = {
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        cccd: form.cccd.trim(),
      }
      if (!editingId || form.password) {
        payload.password = form.password
      }

      if (editingId) {
        const updated = await request('put', `/staff/${editingId}`, payload)
        setStaffList((current) => current.map((staff) => (staff.id === updated.id ? updated : staff)))
        setMessage('Đã cập nhật nhân viên.')
      } else {
        const created = await request('post', '/staff', payload)
        setStaffList((current) => [...current, created])
        setMessage('Đã thêm nhân viên mới.')
      }
      resetForm()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setLoading(true)
    setMessage('')

    try {
      await request('delete', `/staff/${deleteTarget.id}`)
      setStaffList((current) => current.filter((staff) => staff.id !== deleteTarget.id))
      if (editingId === deleteTarget.id) resetForm()
      setDeleteTarget(null)
      setMessage('Đã xóa nhân viên.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="staff-management-page">
      <div className="staff-management-layout">
        <form className="staff-management-form panel" onSubmit={submit}>
          <div className="staff-management-form-head">
            <h2>Thêm / Sửa thông tin</h2>
            <span>{formTitle}</span>
          </div>

          {message && <p className="staff-management-message">{message}</p>}

          <label className="form-field">
            <span>Họ và tên</span>
            <input name="fullName" value={form.fullName} onChange={updateField} required />
          </label>

          <label className="form-field">
            <span>Username</span>
            <input name="username" value={form.username} onChange={updateField} required />
          </label>

          <label className="form-field">
            <span>Password</span>
            <div className="staff-password-field">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={updateField}
                placeholder={editingId ? 'Để trống nếu không đổi' : 'Nhập password'}
                required={!editingId}
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)}>
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </label>

          <label className="form-field">
            <span>CCCD</span>
            <input name="cccd" value={form.cccd} onChange={updateField} />
          </label>

          <div className="staff-management-actions">
            <button className="primary-button full" type="submit" disabled={loading}>
              Đồng ý
            </button>
            {editingId && (
              <button className="ghost-button full" type="button" onClick={resetForm} disabled={loading}>
                Hủy sửa
              </button>
            )}
          </div>
        </form>

        <section className="staff-management-table panel table-panel">
          <div className="staff-management-table-head">
            <h2>Nhân viên</h2>
            <button className="ghost-button compact" type="button" onClick={() => loadStaff().catch((error) => setMessage(error.message))}>
              Làm mới
            </button>
          </div>

          <div className="staff-management-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>CCCD</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td>
                      <strong>{staff.fullName}</strong>
                      <span className="table-subtext">{staff.role}</span>
                    </td>
                    <td>{staff.username}</td>
                    <td>{passwordText(staff)}</td>
                    <td>{staff.cccd || 'Chưa có'}</td>
                    <td>
                      <div className="staff-management-row-actions">
                        <button className="ghost-button compact" type="button" onClick={() => editStaff(staff)}>
                          Sửa
                        </button>
                        <button className="ghost-button compact danger" type="button" onClick={() => setDeleteTarget(staff)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedStaff.length === 0 && (
                  <tr>
                    <td colSpan="5" className="staff-management-empty">Chưa có nhân viên.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {deleteTarget && (
        <div className="staff-management-modal-backdrop" onClick={() => !loading && setDeleteTarget(null)}>
          <div className="staff-management-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Xóa nhân viên {deleteTarget.fullName}?</h2>
            <p>Nhân viên này sẽ bị ẩn khỏi hệ thống và bị gỡ khỏi phân công khu vực hiện tại.</p>
            <div className="staff-management-modal-actions">
              <button className="primary-button danger-button" type="button" onClick={confirmDelete} disabled={loading}>
                Đồng ý
              </button>
              <button className="ghost-button" type="button" onClick={() => setDeleteTarget(null)} disabled={loading}>
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
