export const APP_TIME_ZONE = 'Asia/Ho_Chi_Minh'
const APP_UTC_OFFSET = '+07:00'

function parseDateValue(value) {
  if (!value) return null
  if (value instanceof Date) return value

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(`${value}T00:00:00${APP_UTC_OFFSET}`)
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return new Date(`${value}:00${APP_UTC_OFFSET}`)
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(value)) {
      return new Date(`${value}${APP_UTC_OFFSET}`)
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/.test(value)) {
      return new Date(`${value}${APP_UTC_OFFSET}`)
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)) {
      return new Date(value.replace(' ', 'T') + `:00${APP_UTC_OFFSET}`)
    }

    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
      return new Date(value.replace(' ', 'T') + APP_UTC_OFFSET)
    }
  }

  return new Date(value)
}

function formatParts(value, options) {
  const date = parseDateValue(value)
  if (!date || Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).formatToParts(date)
}

function getPart(parts, type) {
  return parts?.find((part) => part.type === type)?.value || ''
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function formatDate(value) {
  const date = parseDateValue(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(date)
}

export function formatDateOnly(value) {
  const date = parseDateValue(value)
  if (!date || Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeZone: APP_TIME_ZONE,
  }).format(date)
}

export function formatLongVietnameseDate(value) {
  const parts = formatParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  if (!parts) return '-'
  return `ngày ${getPart(parts, 'day')}, tháng ${getPart(parts, 'month')}, năm ${getPart(parts, 'year')}`
}

export function toDateInput(value) {
  const parts = formatParts(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  if (!parts) return ''
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}T${getPart(parts, 'hour')}:${getPart(parts, 'minute')}`
}

export function todayInput() {
  const parts = formatParts(new Date(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  if (!parts) return ''
  return `${getPart(parts, 'year')}-${getPart(parts, 'month')}-${getPart(parts, 'day')}`
}

export function toTimestamp(value) {
  const date = parseDateValue(value)
  if (!date || Number.isNaN(date.getTime())) return null
  return date.getTime()
}
