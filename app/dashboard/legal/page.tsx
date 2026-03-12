// app/dashboard/legal/page.tsx
// This file is intentionally a thin re-export.
// The actual routing is handled by the parent dashboard page.tsx via the
// "Legal/Contracts", "Legal/Employees", "Legal/Vehicles" keys.
// If you ever want a standalone /dashboard/legal route, export a redirect or landing here.

export { default } from "../legal/LegalContracts";