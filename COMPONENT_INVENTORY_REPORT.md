Now I have all the information needed. Let me compile a comprehensive analysis report:

# Component Inventory Report — Enterprise Attendance Application

## Directory Structure

```
src/components/
├── Admin/
│   ├── AdminModePage.tsx          (25KB) - Main admin hub with tabs
│   ├── AdminSetup.tsx              (3KB) - Setup instructions
│   ├── AssignMeeting.tsx          (11KB) - Meeting assignment form
│   ├── EmployeeManagement.tsx     (23KB) - CRUD for employees
│   ├── KioskMode.tsx               (9KB) - Public kiosk interface
│   ├── LeaveManagement.tsx        (10KB) - Leave request approvals
│   ├── OverallAttendancePage.tsx  (28KB) - aggregated attendance view
│   └── WorkingHoursSettingsForm.tsx (15KB) - Work hours config
├── Attendance/
│   ├── AttendanceLogsNew.tsx      (24KB) - Historical logs + export
│   └── AttendancePageNew.tsx      (17KB) - Employee's own attendance
├── Auth/
│   └── UnifiedLoginPage.tsx       (12KB) - Login page with hero
├── common/
│   ├── AintrixLogo.tsx             (2KB) - SVG logo component
│   ├── DashboardInfoModal.tsx      (0 bytes!) - Empty stub
│   ├── LeaveRequestModal.tsx       (7KB) - Modal for leave requests
│   ├── ProtectedRoute.tsx          (4KB) - Auth/role guard
│   ├── TermsAndConditionsModal.tsx (16KB) - T&C viewer
│   ├── WorkingHoursInfo.tsx        (4KB) - Info card about work hours
│   └── index.ts                    274 B - Barrel export
├── Dashboard/
│   ├── EmployeeDashboardNew.tsx   (19KB) - Main employee dashboard
│   └── UnifiedDashboardNew.tsx     889 B - Route dispatcher
├── Employee/
│   └── ClockInOutNew.tsx          (31KB) - Clock in/out with breaks
├── Layout/
│   ├── Header.tsx                  (3KB) - Top bar
│   └── Sidebar.tsx                (12KB) - Collapsible nav
└── Settings/
    └── SettingsModal.tsx          (22KB) - User preferences
```

---

## Component Breakdown

### AdminModePage.tsx (Admin Hub)

- **Location:** `src/components/Admin/AdminModePage.tsx`
- **Styling:** 100% Tailwind utility classes (no CSS modules)
- **Key UI:**
  - Tabbed interface (Meetings | Leaves | Working Hours)
  - Stats cards row (4 cards: Total, Scheduled, Completed, Today)
  - Meets data table with search + filter dropdowns
  - Meeting form modal with employee multi-select
- **Sub-components:** `<LeaveManagement />`, `<WorkingHoursSettingsForm />`
- **Color scheme:** Gray-50/100/200/500/900, Blue-600 (primary), Green-600 (success),Yellow-600 (warning), Red-600 (danger), Purple-600 (muted)

### EmployeeManagement.tsx

- **Location:** `src/components/Admin/EmployeeManagement.tsx`
- **Styling:** Tailwind classes
- **Key UI:**
  - Action bar: Refresh, Invite Employee, Add Employee buttons
  - Search input with Search icon
  - Employee table columns: avatar+name+email (row), ID, Department, Role badge, Status badge, Actions
  - Add/Edit Modal (same form)
  - Invite Employee Modal (email-only invitation flow)
- **Sub-components:** Two inline modal components defined within file
- **Badge colors:** Role: purple (admin), green (employee); Status: green (active), red (inactive)

### ClockInOutNew.tsx (Employee Time Tracker)

- **Location:** `src/components/Employee/ClockInOutNew.tsx`
- **Styling:** Tailwind; heavy use of conditional colors (red-50, orange-50, blue-50, green-50, purple-50)
- **Key UI Sections:**
  - Header with live clock: `<LiveClockDisplay />` (ticks every second)
  - Status cards: Clock In, Clock Out, Working Hours (3-column grid)
  - Today's Status panel: status badge + times + breaks count
  - Location status indicator (green/red dot + coords)
  - Action buttons: Clock In / Clock Out / Start Break / End Break / Return from Lunch
  - Today's Breaks summary list
  - Today's Stats summary grid
  - Late reason modal (if clock-in after 10:00 AM)
- **Sub-components:** `<LiveClockDisplay />`, `<LiveWorkingHours />`, `<LiveBreakDuration />` — all memoized micro-components that tick independently
- **Location validation:** Validates IP + geofence before clock-in (configurable via DB)
- **Auto-lunch:** Automatically starts lunch at 2:00 PM if not already on break

### EmployeeDashboardNew.tsx

- **Location:** `src/components/Dashboard/EmployeeDashboardNew.tsx`
- **Styling:** Tailwind with gradient hero (`from-blue-600 to-purple-600`)
- **Key UI:**
  - `<WorkingHoursInfo />` info banner
  - Welcome banner with employee name, LiveClock, role, department
  - Quick stats grid (3 cols): This Week hours, Days Present, Daily Average
  - Two-column layout: left = `<ClockInOutNew />`, right = Today's Status + Upcoming Meetings
- **Sub-components:** `<ClockInOutNew />`, `<WorkingHoursInfo />`, inline `LiveClock` (memo)
- **Data fetching:** TanStack Query hooks for today's record, weekly stats, meetings
- **Colors:** Primary blue-600, Success green-600, Info purple-600, Warning yellow-600

### AttendancePageNew.tsx (Employee's Own Logs)

- **Location:** `src/components/Attendance/AttendancePageNew.tsx`
- **Styling:** Tailwind; card layout with `shadow-sm border`
- **Key UI:**
  - Header: Title + Month navigation (prev/next + month label)
  - My Leave Requests table (if employee has any)
  - Stats grid: 4 cards (Days Present, Attendance Rate, Total Hours, Late Days)
  - Attendance table: Date, Status (badge+icon), Clock In, Clock Out, Hours Worked, Breaks count
- **Status colors:** Green (present), Yellow (late), Red (absent)
- **Empty state:** Calendar icon + message

### AttendanceLogsNew.tsx (Admin View, All Employees)

- **Location:** `src/components/Attendance/AttendanceLogsNew.tsx`
- **Styling:** Tailwind; more complex multi-section layout
- **Key UI:**
  - Header with Export Excel button
  - Summary cards: Total Employees, Total Hours, Present Days, Late Days
  - Filters row: Month nav (chevrons), Employee dropdown, Search input
  - Per-employee expandable sections: employee header + quick stats grid + daily records table
  - My Leave Requests section (only shows if logged-in employee)
  - Terms & Conditions modal
- **Sub-components:** `<TermsAndConditionsModal />`
- **Excel export:** Uses `xlsx` + `file-saver` to generate `.xlsx` reports
- **Large file:** 590 lines — handles hundreds of employees

### OverallAttendancePage.tsx (Aggregated Admin Dashboard)

- **Location:** `src/components/Admin/OverallAttendancePage.tsx`
- **Styling:** Tailwind with toggle tabs (Today / Monthly) and date picker
- **Key UI (Today mode):**
  - Stats cards: Total Employees, Present Today, Absent Today, Attendance Rate
  - Table: Employee, Status badge+icon, Clock In, Clock Out, Total Hours, Break Duration, Late Reason
  - Search + status filter
- **Key UI (Monthly mode):**
  - Date picker + employee search-by-name (datalist)
  - Table: Date (row), Total Employees, Present count+icon, Absent count+icon, Late count+icon, Attendance Rate + color dot (green/yellow/red)
- **Color logic:** Attendance rate >=80% → green dot, >=60% → yellow, else red

### LeaveManagement.tsx (Admin Leave Approvals)

- **Location:** `src/components/Admin/LeaveManagement.tsx`
- **Styling:** Tailwind
- **Key UI:**
  - Header with pending count badge
  - Filter tabs: All | Pending | Approved | Rejected (pill buttons, blue active)
  - Leave request cards: header with employee name + leave type badge + status badge; grid of date range, clock icon for duration; reason box; approve/reject action buttons
- **Badge colors per leave type:** Vacation (blue), Sick (red), Personal (purple), Emergency (orange)
- **Status:** Pending = yellow, Approved = green, Rejected = red

### WorkingHoursSettingsForm.tsx

- **Location:** `src/components/Admin/WorkingHoursSettingsForm.tsx`
- **Styling:** Tailwind; form organized in gray-bordered sections
- **Key UI Sections:**
  - Daily Working Hours: Start/End time (2 number inputs each)
  - Lunch Break: Start/End time
  - Calculation Settings: Standard Work Hours, Overtime Threshold
  - Security & Validation: IP match toggle, Geofence toggle (toggle switches styled as tracked buttons)
- **Submit:** Save button at bottom
- **Validation:** Work end > start, lunch end > start, lunch within work hours, positive hours
- **Toast:** Success/error feedback

### UnifiedLoginPage.tsx

- **Location:** `src/components/Auth/UnifiedLoginPage.tsx`
- **Styling:** Responsive split-screen layout (hidden on mobile, visible on md+)
  - Left: Hero image (Unsplash office photo) with gradient overlay
  - Right: Login card with Inter font, gray-50 background, white card, gray-900 primary text
- **Key UI:**
  - AintrixLogo (inline component defined inside file — separate from `common/AintrixLogo.tsx`)
  - Email + Password fields with Mail/Lock icons + show/hide password toggle
  - Sign In button (bg-gray-900 hover:bg-gray-800)
  - Google + Apple social login buttons (commented as "coming soon")
  - Footer: version text
- **Responsive:** Card max-width changes across breakpoints (xs→sm→md→lg→xl)
- **Auto-redirect:** useEffect that immediately navigates to `/dashboard` if already authenticated
- **Theme:** Light only (no dark mode)

### Header.tsx (Top bar)

- **Location:** `src/components/Layout/Header.tsx`
- **Styling:** `bg-white border-b border-gray-200 px-6 py-4`
- **Key UI:**
  - Left: Welcome + first name + live date (via `formatOffice`)
  - Right: Search (hidden on mobile), Notification bell (with red dot), User avatar+name+role, Settings gear icon, Logout icon
- **Modals:** SettingsModal on gear click
- **Logout:** Calls `useAuth().logout()`
- **Compact design:** Avatar shows first letter of name in gray-900 on white rounded square

### Sidebar.tsx

- **Location:** `src/components/Layout/Sidebar.tsx`
- **Styling:** Collapsible sidebar (`w-16` collapsed / `w-64` expanded)
- **Key UI:**
  - Header: AINTRIX logo + title + menu toggle (X or Menu icon)
  - Nav items: Role-based — employees see Dashboard & Attendance Logs; admins see Employee Mode (grouped Dashboard+Logs), Admin Mode, Overall Attendance, Employees
  - Footer: Current date/time (single-line format) — shows full DD/MM if expanded, short time only if collapsed
  - User menu dropdown (Settings → opens SettingsModal) + Logout button
- **Icons:** Home, Calendar, Settings, Users, BarChart3, UserCheck, LogOut, ChevronDown
- **Notification overlay:** Hard-coded mock list (not real data)
- **Active states:** Admin mode group highlights when sub-item active; direct links use `bg-gray-900` when active

### AintrixLogo.tsx (SVG)

- **Location:** `src/components/common/AintrixLogo.tsx`
- **Styling:** Inline SVG with gradient circle (dark gray to lighter gray), white A-letterform, tech accent dots
- **Props:** `variant` ('black' | 'white'), `size` (px), `className`
- **Text label:** "AINTRIX" + "ATTENDANCE" subtitle
- **Font:** Inter

### LeaveRequestModal.tsx

- **Location:** `src/components/common/LeaveRequestModal.tsx`
- **Styling:** Tailwind; white modal on gray-50 backdrop
- **Fields:** Leave Type (select), Start Date, End Date (date inputs), Reason (textarea)
- **Submit:** Double action buttons: Cancel (text) + Submit Request (blue-600)
- **Validation:** Required fields, end date after start date
- **Toast:** Success/error feedback
- **Used in:** SettingsModal + AttendancePage/Logs (for employees)

### ProtectedRoute.tsx

- **Location:** `src/components/common/ProtectedRoute.tsx`
- **Styling:** Inline Tailwind spinners + error panels
- **Logic:**
  1. If `loading` — show spinner
  2. If `!user` — redirect to `/login`
  3. If `!employee` (session exists but profile missing) — show recoverable error panel with Retry/Sign Out buttons
  4. If `requireAdmin && employee.role !== 'admin'` — redirect to `/dashboard` + toast
  5. Else — render children
- **Fixes:** Prevents infinite redirect loop from UnifiedLoginPage auto-redirect race condition

### TermsAndConditionsModal.tsx

- **Location:** `src/components/common/TermsAndConditionsModal.tsx`
- **Styling:** Full-screenish modal (`max-w-4xl h-[80vh]`) with blue header bar
- **Content:** Sectioned T&C with blue/green/purple/orange/indigo/yellow/red themed boxes
- **Topics covered:** Working hours policy, attendance tracking, location & privacy, data retention, notifications, employee rights/responsibilities
- **Footer:** "I Understand" button
- **Versioned:** Last updated July 11, 2025

### WorkingHoursInfo.tsx

- **Location:** `src/components/common/WorkingHoursInfo.tsx`
- **Styling:** Blue info card (`bg-blue-50 border border-blue-200`)
- **Displays:** Work hours (start–end), lunch break, daily target — all loaded from DB config
- **Note text:** Late threshold reminder + overtime rule

### SettingsModal.tsx

- **Location:** `src/components/Settings/SettingsModal.tsx`
- **Styling:** Two-pane modal: left = vertical tab nav (gray-50); right = scrollable content
- **Tabs:** Profile, Notifications, Appearance, Work Preferences, Privacy & Data
- **Features:**
  - Profile: read-only employee info + language/timezone selects
  - Notifications: 5 toggles (clock-in/out, break, weekly report, sound) + test notification button
  - Appearance: Theme selector (Light/Dark/System cards with icons), Date/Time format selects
  - Work Preferences: Default break duration (select)
  - Privacy: Share Location, Track Productivity toggles
  - "Request Leave" button opens LeaveRequestModal
- **Persistence:** Settings saved to `userService.updateUserSettings()`; loaded from user doc on mount; applies theme immediately
- **Dirty state:** "You have unsaved changes" banner, Cancel / Save Changes buttons

### KioskMode.tsx

- **Location:** `src/components/Admin/KioskMode.tsx`
- **Styling:** Minimalist public terminal UI; large clock display
- **Key UI:**
  - Header: Office Kiosk title + big live clock + full date
  - Two-column grid: left = "Mark Attendance" (Enter Employee ID button); right = "Currently Logged In" employee cards
  - Employee card: avatar circle + name + ID + "Since: HH:mm" + green indicator dot
- **Modal:** Simple employee ID input (Enter key submits)
- **Logic:** Looks up employee by employeeId or id; toggles clock-in/out
- **Use case:** Shared workstation where employees type their ID to record attendance

### AssignMeeting.tsx

- **Location:** `src/components/Admin/AssignMeeting.tsx`
- **Styling:** Two-column form: left = meeting creation, right = employee checklist
- **Key UI:**
  - Meeting form: Title, Description textarea, Date + Time pickers, Selected count summary
  - Employee list: each row = checkbox + avatar placeholder + name + email + department badge
  - Assign button (disabled until required fields filled)
  - Recent meetings list below form (title, desc, date/time, employee count)
- **Colors:** Blue-600 primary, gray-500 secondary

---

## Global Styles & Design Tokens

### Tailwind Configuration (`tailwind.config.js`)

```js
export default {
  theme: {
    extend: {
      fontFamily: {
        'primary': ['Inter'],        // ✅ active base font
        'heading': ['Outfit'],        // not used anywhere yet
        'display': ['Space Grotesk'], // not used anywhere yet
        'mono': ['JetBrains Mono'],   // used in LiveClockDisplay
      },
      colors: {
        primary: { 50→950 slate-gray scale }   // barely used
        accent: { 50→900 sky-blue scale }      // not used anywhere yet
      },
      spacing: { 18: '4.5rem', 88: '22rem', 128: '32rem' },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem' },
      boxShadow: { soft, medium, large } // rarely used
    }
  }
}
```

**Palette actually used in components:**

- Gray scale: `gray-50, gray-100, gray-200, gray-300, gray-400, gray-500, gray-600, gray-700, gray-800, gray-900`
- Semantic colors: `blue-50→700` (primary brand), `green-50→700` (success/present), `red-50→700` (error/absent), `yellow-50→700` (warning/late), `purple-50→700` (muted/neutral), `orange-50→700` (lunch/breaks), `indigo-50→700` (rarely)

### Base CSS (`src/index.css`)

- Imports Inter from Google Fonts
- `@tailwind base/components/utilities` setup
- **Base layer**: sets Inter system-ui stack; sets `body` bgFMinus50, text-gray-900; antialiased
- **Component layer**: defines `.card`, `.btn`, `.input`, `.select`, `.nav-item`, `.badge`, `.status-*`, `.table`, `.progress`, `.sidebar` — *all legacy utility classes that are not used anywhere in the codebase*
- **Utilities layer**: `.text-gradient`, `.shadow-soft/medium/large`, scrollbar styling, custom animations (fadeIn, slideUp, pulseGentle)
- **Note:** The project is ~99% Tailwind utility classes; legacy `.card`/`.btn` classes are unused

### Typography

- Active typeface: **Inter** (weights 400/500/600/700)
- Monospace: JetBrains Mono (used in `<LiveClockDisplay />` and time displays)
- Fallback fonts: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell
- Font weights: headings 600; body 400/500

---

## UI Patterns Observed

### Color Scheme

**Primary Action:** `bg-blue-600` → `hover:bg-blue-700` (buttons, active nav, highlights)  
**Success / Present:** `bg-green-50` (light cards), `bg-green-100` (badges), `text-green-600` (icons)  
**Warning / Late:** `bg-yellow-50` → `text-yellow-600`  
**Error / Absent / Rejected:** `bg-red-50` → `text-red-600`  
**Neutral / Info:** `bg-gray-50`, `bg-gray-100`, `bg-purple-50`, `bg-blue-50`  
**Break / Lunch:** `bg-orange-50` → `text-orange-600`

### Card / Panel Pattern

```tsx
<div className="bg-white rounded-lg shadow-sm border p-6">
  {/* content */}
</div>
```

- Surface: `bg-white`
- Border: `border-gray-200`
- Shadow: `shadow-sm` (most), sometimes `shadow`/`shadow-md`
- Radius: `rounded-lg` (almost universal)
- Padding: `p-6` (cards), `p-4` (tight panels)

### Button Patterns

| Type | Classes | Usage |
|------|---------|-------|
| Primary | `bg-blue-600 text-white hover:bg-blue-700` | Save, Submit, Clock In |
| Secondary | `bg-gray-600 text-white hover:bg-gray-700` | Cancel, Refresh, Back |
| Ghost | `text-gray-600 hover:text-gray-900` | Icon-only buttons |
| Danger | `bg-red-600 hover:bg-red-700` | Clock Out, Delete |
| Success | `bg-green-600 hover:bg-green-700` | Approve |
| Disabled | `bg-gray-300 disabled:cursor-not-allowed` | Loading states |

**Common props:** `px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`

### Form Fields

```tsx
<input
  className="w-full px-3 py-2 border border-gray-300 rounded-lg
             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
/>
```

- Focus ring: `focus:ring-2 focus:ring-blue-500`
- Label: `block text-sm font-medium text-gray-700 mb-1`
- Select uses same classes

### Table Pattern

- Container: `overflow-x-auto` (responsive)
- Table: `min-w-full divide-y divide-gray-200`
- Header: `bg-gray-50` + uppercase `text-gray-500` + `tracking-wider`
- Row hover: `hover:bg-gray-50`
- Empty state: centered icon + message in `py-12`

### Badge / Status Tag

```tsx
<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
  Label
</span>
```

- Pill: `rounded-full` + `px-2.5 py-0.5`
- Small: `text-xs`
- Bold: `font-medium`
- Semantics map status → bg/text colors

### Modal / Dialog Pattern

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg w-full max-w-md mx-4 p-6">
    {/* modal body */}
  </div>
</div>
```

- Overlay: `bg-black/50`
- Container: white card, rounded-lg, constrained `max-w-*`
- Close button: `text-gray-400 hover:text-gray-600` (×)

### Loading Patterns

**Spinner:**

```tsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
```

**Skeleton:** Minimal — most components just show spinner in a centered flex container

### Layout

**App shell:** Sidebar (fixed left, `w-64`) + main content (`flex-1 overflow-auto`)  
**Grid utility:** `grid-cols-{1,2,3,4}` at various breakpoints (mostly `md:` or `lg:`)  
**Spacing scale:** Tailwind defaults; heavy use of `space-y-6`, `gap-6`, `p-6`, `m-6`, `mt-4`, etc

### Icons

- **Library:** Lucide React (v0.344) — all icons are `lucide-react` imports
- **Common icons:** Clock, Calendar, Users, Search, Plus, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Settings, Bell, Lock, Mail, Eye, EyeOff, Home, BarChart3, ChevronLeft/Right/Down, Menu, X, Play, Pause, Coffee, etc.

---

## Architecture Notes

- **State management:** React Query (TanStack) for server state — heavily used in EmployeeDashboardNew and AttendanceLogsNew
- **Auth/protected routes:** `ProtectedRoute` component + `useAuth()` hook (Supabase under the hood)
- **Modals:** Always rendered inline within the component (no portal library)
- **Responsive:** Mobile-first approach with extensive `md:`, `lg:` breakpoints; hamburger menu in Sidebar
- **Timezone handling:** Custom utils `formatOffice`, `getOfficeNow`, `formatOfficeTimeShort`, `formatOfficeTimeLong` that wrap `date-fns-tz`; office timezone is defined in `OFFICE_TIMEZONE` constant (likely Asia/Kolkata)
- **Real-time clocks:** Micro-components (`<LiveClockDisplay />`, `<LiveWorkingHours />`) use `setInterval` in `useEffect` and `memo` to isolate re-renders
- **Code splitting:** App.tsx uses `React.lazy()` for all route-level components; wrapped in `Suspense` + custom `ErrorBoundary`

---

## Color Palette Reference (De Facto)

| Token | Tailwind | Usage |
|-------|----------|-------|
| Background page | `bg-gray-50` | Desktop background, modals |
| Surface | `bg-white` | Cards, modals, header, sidebar |
| Text primary | `text-gray-900` | Headings, body |
| Text secondary | `text-gray-600` | Subtitles, metadata |
| Border | `border-gray-200` | Cards, inputs, tables |
| Hover | `hover:bg-gray-100` / `hover:bg-blue-50` | Row hover, nav items |
| Primary button | `bg-blue-600` | CTA |
| Success | `bg-green-100`/`text-green-800` | Present, active, approved |
| Warning | `bg-yellow-100`/`text-yellow-800` | Late, pending |
| Error | `bg-red-100`/`text-red-800` | Absent, rejected |
| Muted | `bg-purple-100`/`text-purple-800` | Admin badge, info |
| Break | `bg-orange-50`/`text-orange-600` | Lunch/break UI |

---

## File Size Distribution (Largest First)

| File | Size | Reason |
|------|------|--------|
| ClockInOutNew.tsx | 31 KB | Complex time-tracking logic + location + break handling |
| AdminModePage.tsx | 25 KB | Tabbed UI + meeting table + large modal |
| AttendanceLogsNew.tsx | 24 KB | Aggregates all employees; per-employee tables |
| EmployeeManagement.tsx | 23 KB | Table + 2 modals |
| OverallAttendancePage.tsx | 22 KB | Dual view + month-by-month aggregation |
| SettingsModal.tsx | 22 KB | 5-tab settings panel |
| AttendancePageNew.tsx | 17 KB | Month navigation + stats + records table |

---

## Styling Summary

- **No CSS modules, no SASS, no separate files** — styling is 100% inline Tailwind classes
- **No global design tokens** — colors and spacing are hard-coded as Tailwind utilities
- **No custom themes** beyond light mode (dark mode code present but not activated)
- **Legacy CSS component classes** (`.card`, `.btn`, `.input`) are defined in `index.css` but are **not used at all** in the codebase
- **Consistent visual language** emerges from repeated Tailwind patterns:
  - `bg-white + rounded-lg + border + shadow-sm + p-6` → standard card
  - `bg-blue-600 + text-white + rounded-lg + px-4 + py-2` → primary button
  - `bg-gray-50 + border + p-4 + rounded-lg` → info/warning panels
  - `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium` → badge

---

## Component Relationships

```
App.tsx (lazy routes)
├─ Auth
│  └─ UnifiedLoginPage.tsx
├─ Layout
│  ├─ Sidebar.tsx → Header.tsx + SettingsModal.tsx
│  └─ ProtectedRoute.tsx (guard)
├─ Dashboard
│  ├─ UnifiedDashboardNew.tsx → EmployeeDashboardNew.tsx
│  ├─ ClockInOutNew.tsx (Employee)
│  └─ WorkingHoursInfo.tsx
├─ Employee Attendance
│  ├─ AttendancePageNew.tsx (my logs)
│  └─ AttendanceLogsNew.tsx (admin view)
└─ Admin
   ├─ AdminModePage.tsx
   │  ├─ LeaveManagement.tsx
   │  └─ WorkingHoursSettingsForm.tsx
   ├─ OverallAttendancePage.tsx
   ├─ EmployeeManagement.tsx (modals inline)
   ├─ AssignMeeting.tsx
   ├─ KioskMode.tsx
   └─ AdminSetup.tsx
```

**Common components** (modals/utilities):

- `LeaveRequestModal` (used in Settings and Attendance pages)
- `TermsAndConditionsModal` (used in logs view)
- `AintrixLogo` (used in login and sidebar)
- `ProtectedRoute` (wraps all authenticated routes)
- `DashboardInfoModal` (empty)


---

## 🎨 May 2026 Design System Update

The AINTRIX attendance platform has been refactored to a unified, **dusty-pastel aesthetic** with utility-first styling. The following major changes override the legacy styling patterns documented above:

### 1. Foundational Tokens & Global Styles
- **Canvas/Background:** The application background is now `bg-[#E5EDF1]` (dusty pastel blue-gray).
- **Brand Colors:** Custom Tailwind tokens added in `tailwind.config.js` (`brand: #96C2DB`, `brand-soft: rgba(150, 194, 219, 0.20)`).
- **Legacy CSS:** All legacy `.card`, `.btn`, `.input` classes were entirely purged from `index.css`.

### 2. Surface System (Cards & Modals)
- **Cards:** Upgraded from `rounded-lg shadow-sm border` to `bg-white rounded-2xl shadow-sm border border-gray-100`.
- **Modals:** 
  - Backdrop is now a softer `bg-black/30 backdrop-blur-sm`.
  - Container uses `bg-white rounded-2xl shadow-lg border border-gray-100`.

### 3. Components (Buttons & Inputs)
- **Primary Buttons:** `bg-black text-white rounded-xl font-medium shadow-sm hover:bg-gray-800`.
- **Secondary Buttons:** `bg-white text-gray-900 border border-gray-200 rounded-xl hover:bg-[#E5EDF1]`.
- **Form Inputs:** `rounded-xl bg-white focus:ring-2 focus:ring-[#96C2DB]`.

### 4. Status Badges
All high-contrast "neon" status colors were replaced with professional pastel variants:
- **Success/Active:** `bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full`
- **Warning/Pending:** `bg-amber-50 text-amber-700 border border-amber-100 rounded-full`
- **Error/Absent:** `bg-rose-50 text-rose-700 border border-rose-100 rounded-full`
- **Info/Break:** `bg-sky-50 text-sky-700 border border-sky-100 rounded-full`

### 5. Dashboard Hero
The employee dashboard banner gradient (`from-blue-600 to-purple-600`) was stripped and replaced with a dark theme surface: `bg-gray-950 text-white rounded-2xl p-6 shadow-sm`.
