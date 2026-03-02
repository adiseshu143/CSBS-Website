/**
 * AdminCreateEvent — Page wrapper for the event creation form.
 * Route: /admin/create-event (to be wired in App.tsx later)
 *
 * Intended for admin use only. Routing protection is NOT implemented here —
 * it will be handled by ProtectedAdminRoute at the router level.
 */

import AdminEventForm from '../components/AdminEventForm'

const AdminCreateEvent = () => <AdminEventForm />

export default AdminCreateEvent
