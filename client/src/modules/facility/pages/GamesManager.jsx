import { useEffect, useState } from 'react'
import { request } from '../../../services/api'

const emptyForm = {
  name: '',
  description: '',
  status: 'Normal',
  assetStatus: 'Ok',
  capacity: 0,
  cashierIds: [],
  issues: [],
}

function buildIssueKey(issue) {
  return issue.id ? `issue-${issue.id}` : issue.localId
}

function createBlankIssue() {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    description: '',
    resolved: false,
  }
}

function facilityToForm(facility) {
  if (!facility) return emptyForm

  return {
    name: facility.name || '',
    description: facility.description || '',
    status: facility.status || 'Normal',
    assetStatus: facility.assetStatus || 'Ok',
    capacity: facility.capacity ?? 0,
    cashierIds: (facility.cashierIds || []).map(String),
    issues: (facility.issues || []).map((issue) => ({ ...issue, resolved: false })),
  }
}

export default function GamesManager({ session }) {
  const [facilities, setFacilities] = useState([])
  const [cashiers, setCashiers] = useState([])
  const [mode, setMode] = useState('edit')
  const [selectedFacilityId, setSelectedFacilityId] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [cashierDropdownOpen, setCashierDropdownOpen] = useState(false)

  const isManager = session?.user?.role === 'Manager'
  async function loadData(preferredFacilityId = selectedFacilityId) {
    const [facilityRows, cashierRows] = await Promise.all([
      request('get', '/facilities'),
      isManager ? request('get', '/facilities/staff/assignments') : Promise.resolve([]),
    ])
    setFacilities(facilityRows)
    setCashiers(cashierRows)

    const nextFacility = facilityRows.find((facility) => Number(facility.id) === Number(preferredFacilityId)) || facilityRows[0]
    if ((mode === 'edit' || preferredFacilityId) && nextFacility) {
      setSelectedFacilityId(String(nextFacility.id))
      setForm(facilityToForm(nextFacility))
    }
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message))
  }, [])

  function selectFacility(facilityId) {
    const facility = facilities.find((item) => Number(item.id) === Number(facilityId))
    setMode('edit')
    setSelectedFacilityId(String(facilityId))
    setForm(facilityToForm(facility))
    setCashierDropdownOpen(false)
    setMessage('')
  }

  function startCreate() {
    setMode('create')
    setSelectedFacilityId('')
    setForm(emptyForm)
    setCashierDropdownOpen(false)
    setMessage('')
  }

  function updateField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function toggleCashier(cashierId) {
    setForm((current) => {
      const id = String(cashierId)
      const cashierIds = current.cashierIds.includes(id)
        ? current.cashierIds.filter((item) => item !== id)
        : [...current.cashierIds, id]
      return { ...current, cashierIds }
    })
  }

  function updateIssue(issueKey, patch) {
    setForm((current) => ({
      ...current,
      issues: current.issues.map((issue) => (
        buildIssueKey(issue) === issueKey ? { ...issue, ...patch } : issue
      )),
    }))
  }

  function addIssue() {
    setForm((current) => ({
      ...current,
      assetStatus: 'Issue',
      issues: [...current.issues, createBlankIssue()],
    }))
  }

  async function submitFacility(event) {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      status: form.status,
      assetStatus: form.assetStatus,
      capacity: Number(form.capacity || 0),
      issues: form.issues.map((issue) => ({
        id: issue.id,
        description: issue.description,
        resolved: Boolean(issue.resolved),
      })),
    }

    if (isManager) {
      payload.cashierIds = form.cashierIds.map(Number)
    }

    try {
      if (mode === 'create') {
        const created = await request('post', '/facilities', payload)
        setMessage('Đã thêm khu vui chơi')
        setMode('edit')
        await loadData(created.id)
      } else {
        if (!selectedFacilityId) {
          setMessage('Vui lòng chọn khu vui chơi cần cập nhật')
          return
        }
        const updated = await request('put', `/facilities/${selectedFacilityId}`, payload)
        setMessage('Đã cập nhật khu vui chơi')
        await loadData(updated.id)
      }
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function uploadFacilityImage(facilityId, file) {
    if (!file) return

    const data = new FormData()
    data.append('image', file)
    setMessage('')

    try {
      await request('post', `/facilities/${facilityId}/image`, data)
      setMessage('Đã upload ảnh khu vui chơi')
      await loadData(facilityId)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectedCashierText = form.cashierIds.length > 0
    ? cashiers
      .filter((cashier) => form.cashierIds.includes(String(cashier.staffId)))
      .map((cashier) => cashier.fullName || cashier.username)
      .join(', ')
    : 'Chọn nhân viên thu ngân'

  return (
    <section className="facility-container">
      <div className="facility-page-header">
        <h1>Khu vui chơi</h1>
        {isManager && (
          <button className="facility-add-button" type="button" onClick={startCreate}>
            + Thêm khu mới
          </button>
        )}
      </div>

      <div className="facility-layout">
        <form className="facility-form-card" onSubmit={submitFacility}>
          <h2>Quản lý khu vui chơi</h2>
          {message && <p className="facility-message">{message}</p>}

          {mode === 'edit' ? (
            <div className="form-group">
              <label htmlFor="facilityId">Chọn khu</label>
              <select id="facilityId" value={selectedFacilityId} onChange={(event) => selectFacility(event.target.value)} required>
                <option value="">Chọn khu vui chơi</option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>{facility.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="facilityName">Tên khu mới</label>
              <input id="facilityName" name="name" value={form.name} onChange={updateField} required />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="facilityDescription">Mô tả</label>
            <textarea id="facilityDescription" name="description" value={form.description} onChange={updateField} />
          </div>

          <div className="facility-form-row">
            <div className="form-group">
              <label htmlFor="facilityStatus">Tình trạng</label>
              <select id="facilityStatus" name="status" value={form.status} onChange={updateField}>
                <option value="Normal">Hoạt động</option>
                <option value="Maintenance">Bảo trì</option>
                <option value="Broken">Hỏng</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="facilityAssetStatus">CSVC</label>
              <select id="facilityAssetStatus" name="assetStatus" value={form.assetStatus} onChange={updateField}>
                <option value="Ok">CSVC OK</option>
                <option value="Issue">CSVC cần xử lý</option>
              </select>
            </div>
          </div>

          {form.assetStatus === 'Issue' && (
            <div className="facility-issue-box">
              <span className="facility-issue-title">Danh sách vấn đề CSVC</span>
              {form.issues.length === 0 && (
                <p className="facility-empty-text">Chưa có vấn đề nào được ghi nhận.</p>
              )}
              {form.issues.map((issue) => {
                const issueKey = buildIssueKey(issue)
                return (
                  <div className="facility-issue-row" key={issueKey}>
                    <input
                      type="checkbox"
                      checked={Boolean(issue.resolved)}
                      onChange={(event) => updateIssue(issueKey, { resolved: event.target.checked })}
                      aria-label="Đánh dấu đã xử lý"
                    />
                    <input
                      value={issue.description}
                      onChange={(event) => updateIssue(issueKey, { description: event.target.value })}
                      placeholder="Mô tả vấn đề"
                    />
                  </div>
                )
              })}
              <button className="facility-link-button" type="button" onClick={addIssue}>
                + Thêm vấn đề
              </button>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="facilityCapacity">Sức chứa</label>
            <input id="facilityCapacity" name="capacity" type="number" min="0" value={form.capacity} onChange={updateField} />
          </div>

          <div className="form-group">
            <label>Nhân viên thu ngân</label>
            <div className="cashier-dropdown">
              <button
                className="cashier-dropdown-toggle"
                type="button"
                onClick={() => isManager && setCashierDropdownOpen((current) => !current)}
                disabled={!isManager}
              >
                <span>{selectedCashierText}</span>
                <span className="cashier-dropdown-arrow">▾</span>
              </button>
              {cashierDropdownOpen && isManager && (
                <div className="cashier-dropdown-menu">
                  {cashiers.map((cashier) => (
                    <label className="cashier-dropdown-option" key={cashier.staffId}>
                      <input
                        type="checkbox"
                        checked={form.cashierIds.includes(String(cashier.staffId))}
                        onChange={() => toggleCashier(cashier.staffId)}
                      />
                      <span>{cashier.fullName || cashier.username} ({cashier.username})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {!isManager && (
              <span className="facility-help-text">Chỉ Manager được phân công nhân viên thu ngân.</span>
            )}
          </div>

          <button className="facility-submit-button" type="submit" disabled={loading}>
            {mode === 'create' ? 'Thêm khu' : 'Cập nhật'}
          </button>
        </form>

        <div className="facility-table-card">
          <h2>Danh sách khu vui chơi</h2>
          <div className="facility-table-wrap">
            <table className="facility-table">
              <thead>
                <tr>
                  <th>Khu</th>
                  <th>Tình trạng</th>
                  <th>CSVC</th>
                  <th>Sức chứa</th>
                  <th>Hình ảnh</th>
                  <th>Thu ngân</th>
                  <th>Vấn đề CSVC</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id}>
                    <td>
                      <button className="facility-row-button" type="button" onClick={() => selectFacility(facility.id)}>
                        {facility.name}
                      </button>
                      <span>{facility.description}</span>
                    </td>
                    <td>{facility.status}</td>
                    <td>{facility.assetStatus === 'Issue' ? 'CSVC cần xử lý' : 'CSVC OK'}</td>
                    <td>{facility.capacity}</td>
                    <td>
                      <div className="facility-image-cell">
                        {facility.imageUrl ? (
                          <img src={facility.imageUrl} alt={facility.name} />
                        ) : (
                          <span>Chưa có ảnh</span>
                        )}
                        {isManager && (
                          <>
                            <input
                              id={`facility-image-${facility.id}`}
                              className="facility-file-input"
                              type="file"
                              accept="image/*"
                              onChange={(event) => {
                                uploadFacilityImage(facility.id, event.target.files?.[0])
                                event.target.value = ''
                              }}
                            />
                            <label className="facility-upload-button" htmlFor={`facility-image-${facility.id}`}>
                              Thêm ảnh
                            </label>
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      {(facility.cashiers || []).length > 0
                        ? facility.cashiers.map((cashier) => cashier.fullName || cashier.username).join(', ')
                        : 'Chưa phân công'}
                    </td>
                    <td>{(facility.issues || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
