export default function PrivateRoute({ allowed, children, fallback = null }) {
  return allowed ? children : fallback
}
