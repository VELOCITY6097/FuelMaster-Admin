# FuelMaster Admin (React v1.0)

**Status:** Private / Internal Use Only  
**Description:** A real-time administration dashboard for managing fuel stations, staff, and system configurations. Migrated from static HTML to **React 19** for dynamic state management and performance.

## 🛠️ Tech Stack
* **Frontend:** React 19, React Router v7
* **Backend/DB:** Supabase (PostgreSQL & Realtime)
* **UI/Icons:** Lucide React, CSS Modules (Custom Dark/Light Theme)
* **Charts:** Recharts
* **Logging:** Discord Webhooks

## 🚀 Features Overview

### 1. 📊 Dashboard & Analytics
* **Live Overview:** Real-time counters for total stations, staff, and system status.
* **Activity Graph:** 7-day visual history using `recharts`.
* **Status Indicators:** Visual cues for System Online vs. Maintenance Mode.

### 2. ⛽ Station Management
* **Full CRUD:** Create, Edit, and Delete stations.
* **Tank Config:** Dynamic addition of tanks (e.g., MS_15KL, HSD_20KL) per station.
* **Smart Search:** Filter by Brand (BPCL, IOCL, HPCL, Jio) or Station ID/Name.
* **Quick Actions:** One-click "Copy Station ID" button.

### 3. 👥 Staff & Security (RBAC)
* **Role-Based Access:**
    * **Owner:** Full system access (Settings, Database Assets, Team).
    * **Moderator:** System controls & Broadcasts.
    * **Staff:** Station management only.
* **Authentication:** Custom Phone + PIN login with "Remember Me" functionality.

### 4. ⚙️ System Control
* **Global Broadcast:** Send push notifications (Info/Warning/Critical) to all client screens.
* **Maintenance Mode:** Instantly lock all client applications from the admin panel.
* **Database Assets:** Upload/Edit density tables and tank charts directly from the UI.

### 5. 📝 Activity Logging
* **Discord Integration:** Automatic logging for high-priority events (Login, Delete, Config Change).
* **Log Types:** Color-coded embeds for easier reading (Green=Create, Red=Delete/Lock, etc.).

---

## 📂 Project Structure

```text
src/
├── App.js           # MAIN LOGIC: Routing, Auth, Contexts, Pages
├── logs.js          # LOGGING: Discord Webhook configurations & formatters
├── App.css          # STYLES: Global variables, Dark mode, Component styles
├── index.js         # ENTRY: React DOM rendering
└── components/      # (Internal components like ReactLoader, ToastProvider)
