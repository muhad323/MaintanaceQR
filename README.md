# Project QR

A mobile-first Progressive Web App (PWA) built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**. Designed for staff to scan QR codes on physical scale models, view project details, and submit maintenance logs with photos directly into company **Odoo**.

The application has **NO database of its own**; all project data, attachments, and maintenance logs live strictly in Odoo.

---

## Brand Configuration

Official **Mimar Models** brand assets and color swatches are centralized:
- **Logos**:
  - `/public/brand/logo.png` (Official Mimar Models full-color horizontal lockup)
  - `/public/brand/logo-white.png` (Official Mimar Models white lockup)
  - `/public/brand/logo-mark.png` (Official Mimar `#5d7f9c` square icon, also resized to `/public/icons/icon-192.png` and `/public/icons/icon-512.png`)
- **Font**: Loaded via `next/font/local` from `/public/brand/fonts/BrandFont.woff2` and applied across all text via CSS variable `--font-brand`.
- **Colours** (from official Mimar brand sheet, defined once in `app/globals.css` and mapped to Tailwind tokens in `tailwind.config.ts`):
  - `--color-primary`: `#5d7f9c` (Mimar Primary Color — Pantone 5415c / NCS S4030-B)
  - `--color-primary-dark`: `#48657f`
  - `--color-secondary`: `#688096`
  - `--color-background`: `#f2f5f8`
  - `--color-surface`: `#ffffff`
  - `--color-text`: `#1c2833`
  - `--color-accent`: `#b2825e` (Pantone 7510 U)
  - `--color-sand`: `#d5bfa9` (Pantone 4685 C)
  - `--color-border`: `#d3dfe8`
  - Status tokens:
    - Done: `--color-done` (`#276359`, Pantone 561 C) / `--color-done-bg` (`#e6eeed`)
    - Pending: `--color-pending` (`#b2825e`, Pantone 7510 U) / `--color-pending-bg` (`#f8f2ed`)
    - Issue: `--color-issue` (`#9f5b46`, Complementary Terracotta) / `--color-issue-bg` (`#f5ece9`)

---

## Required Odoo Configuration

Ensure your company Odoo instance has the following custom fields, models, and groups configured:

### 1. Custom Field on `project.project`
- **Model**: `project.project` (Projects)
- **Field Name**: `x_qr_token`
- **Field Label**: QR Token
- **Field Type**: `Char`

Optional Project Identification custom fields on `project.project` (if omitted in Odoo, `RealOdooService` also preserves them automatically in project metadata):
- `x_work_order_no` (`Char`): Work Order No (e.g. `MM-12345`)
- `x_project_manager` (`Char`): Project Manager
- `x_programmer` (`Char`): Programmer
- `x_scale` (`Char`): Scale (e.g. `1-1000`)
- `x_delivery_date` (`Char`): Delivery Date (e.g. `13.11.2026`)
- `x_base_size` (`Char`): Base Size (e.g. `3M X 2 M X 5 M`)
- `x_power_consumption` (`Char`): Power Consumption (e.g. `300 WATTS`)

### 2. Custom Model `x_maintenance_log`
- **Model Name**: `x_maintenance_log`
- **Model Description**: Maintenance Log
- **Fields**:
  - `x_project_id`: **Many2one** to `project.project` (Relation: Projects)
  - `x_note`: **Text** (Observations / Work completed)
  - `x_status`: **Selection**
    - `done`: Done
    - `pending`: Pending
    - `issue`: Issue
  - `x_done_by`: **Char** (Logged-in user name)
  - `x_date`: **Datetime** (Timestamp)

### 3. Attachments (`ir.attachment`)
- Standard Odoo attachment model used for storing maintenance photos linked to `x_maintenance_log` (`res_model="x_maintenance_log"`, `res_id=<log_id>`).

### 4. Security Groups (`res.groups`)
- `QR App Users`: Required for staff to log in and access the scanner and project pages.
- `QR App Admins`: Required to access `/admin` for generating and printing QR labels.

---

## Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Description | Example |
| :--- | :--- | :--- |
| `ODOO_URL` | Base URL of Odoo instance | `https://odoo.yourcompany.com` |
| `ODOO_DB` | Odoo database name | `production_db` |
| `ODOO_ROBOT_LOGIN` | Service robot user login in Odoo | `robot_service@yourcompany.com` |
| `ODOO_ROBOT_API_KEY` | Service robot API key or password | `your_robot_api_key` |
| `SESSION_SECRET` | Secret key for signing session JWT (min 32 chars) | `your-secure-random-32-char-string` |
| `APP_BASE_URL` | Public base URL of this app | `http://localhost:3000` |
| `USE_MOCK_ODOO` | Use in-memory mock data (`true` / `false`) | `true` |

---

## Mock Test Logins (`USE_MOCK_ODOO=true`)

When running in mock mode, only the following two test accounts are accepted:

- **Staff (normal user)**: `staff@test.com` / `staff123`
- **Admin (can open `/admin`)**: `admin@test.com` / `admin123`

Any other login or password returns **"Wrong login or password"**.

---

## Development & Deployment

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Docker Deployment
> **Internal Network / VPN Note**: If your Odoo instance is hosted inside a private corporate network or VPN, this container must be deployed within that same internal network or private VPC peering.

```bash
# Build Docker image
docker build -t project-qr .

# Run container
docker run -d \
  -p 3000:3000 \
  --name project-qr \
  --env-file .env.local \
  project-qr
```

---

## Manual Test Instructions by Phase

### Phase 1: Base App & Mock Data
1. Open [http://localhost:3000](http://localhost:3000); verify automatic redirect to `/login`.
2. Inspect `/login`: clean branding logo, "Sign in" title, User ID and Password fields with show/hide toggle, and one "Sign in" button.
3. Test login: enter `admin@test.com` / `admin123` to log in as administrator, or `staff@test.com` / `staff123` as normal user. Verify any other login shows `"Wrong login or password"`.
4. Open a project page (e.g. [http://localhost:3000/project/proj_qr_dubai_opera_101](http://localhost:3000/project/proj_qr_dubai_opera_101)).
5. Check project card: verify Name, Customer, Project Manager, Stage, Dates, and Description.
6. Test photo maintenance submission:
   - Select status (**Done**, **Pending**, or **Issue**).
   - Enter a note.
   - Click "Take photo" or "Choose from gallery" to select photos.
   - Verify client-side compression (max 1600px, JPEG quality 0.8) and thumbnails with `X` remove buttons (up to 6 photos).
   - Click **Save update**.
   - Confirm success message, form reset, and new log appearing at the top of the history with photo thumbnails.
   - Tap any photo thumbnail to verify the large photo modal viewer.

### Phase 2: In-App QR Scanner
1. Tap **Scan** in the bottom navigation.
2. Grant camera permissions when prompted.
3. Verify the camera opens using the back camera by default with a clean, subtle frame overlay.
4. Scan a valid project QR (`http://localhost:3000/project/<token>`); verify immediate transition to the project details page.
5. Scan an external or invalid QR; verify the error message *"This QR is not from Project QR."* with a "Scan again" button.
6. In Incognito mode, visit a `/project/[token]` URL; confirm middleware redirects to `/login` without exposing any project data.

### Phase 3: Admin QR Generator & Print Labels
1. Sign in as admin (`admin@test.com` / `admin123`).
2. Tap **Admin** in the bottom navigation bar (visible only to admins).
3. Search projects by name or customer.
4. Click **Generate QR** or **Generate all** to assign 24-character random tokens to projects missing one.
5. Click **PNG** to download the QR code image.
6. Click **Print labels**; verify print preview arranges sticker labels (QR, project name, small logo) cleanly across the A4 page without headers or navigation.

### Phase 4: Real Odoo Connection
1. In `.env.local`, set `USE_MOCK_ODOO=false` and configure `ODOO_URL`, `ODOO_DB`, `ODOO_ROBOT_LOGIN`, and `ODOO_ROBOT_API_KEY`.
2. As admin, visit `http://localhost:3000/api/health`; verify status `ok`, Odoo version, and presence of custom fields and security groups.
3. Sign in with an Odoo user account belonging to `"QR App Users"`.
4. Scan a physical model's QR code, submit a maintenance note with photos, and verify in Odoo backend that the `x_maintenance_log` record and its `ir.attachment` records are created.

### Phase 5: Hardening & PWA
1. **Rate Limiting**: Attempt 7 failed logins in a row; verify the rate limiter blocks further attempts.
2. **Generic 404**: Visit `http://localhost:3000/project/unknown-code-123`; verify generic "Project not found" message.
3. **PWA**: Verify install prompt in mobile/desktop browser with custom icon and standalone display.
