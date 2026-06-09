import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const staff = JSON.parse(localStorage.getItem('tbg_staff') || 'null')
  const customer = JSON.parse(localStorage.getItem('tbg_customer') || 'null')
  const token = config.authScope === 'customer' ? customer?.token : staff?.token || customer?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function request(method, url, data, config = {}) {
  try {
    const response = await api.request({ method, url, data, ...config })
    return response.data.data
  } catch (error) {
    const message = error.response?.data?.message || error.message || 'Không thể kết nối máy chủ'
    const requestError = new Error(message, { cause: error })
    requestError.status = error.response?.status
    throw requestError
  }
}

export default api
