// app/dashboard/documents/page.tsx
// This file is intentionally a thin re-export.
// The actual routing is handled by the parent dashboard page.tsx via the
// "Documents/Employees", "Documents/Vehicles", "Documents/Organizations" keys.
// If you ever want a standalone /dashboard/documents route, export a redirect or landing here.

export { default } from "../documents/DocuVehicles";