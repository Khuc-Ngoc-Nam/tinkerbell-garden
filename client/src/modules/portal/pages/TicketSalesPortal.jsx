import { Navigate, Route, Routes } from 'react-router-dom'
import CustomerFacilities from './CustomerFacilities'
import HomePage from './HomePage'
import ServiceProducts from './ServiceProducts'

export default function TicketSalesPortal() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/facility/:id" element={<CustomerFacilities />} />
      <Route path="/service/:serviceId" element={<ServiceProducts />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
