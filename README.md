---

# 🕹️ FuelMaster Central Controller (Admin)

The **FuelMaster Admin Console** is the authoritative management layer for the FuelMaster ecosystem. It is designed to remotely provision, configure, and control distributed client-side pump systems. Instead of hardcoding settings at the station level, this controller allows you to define the operational parameters for every pump in your network from a single dashboard.

## 🏗️ Remote Client Control logic

This admin panel functions as the "brain" for the client-side applications by managing:

* **Dynamic Provisioning**: Assign unique `Station IDs` and manager credentials to new pumps, which are then used by the client-side apps to pull their specific configurations.
* **Theme Injection**: Remotely set the visual branding (BPCL, IOCL, HPCL, or Jio-bp) for each client. When a station logs in, the client-side UI automatically adapts to the brand theme defined here.
* **Tank Architecture**: Define exactly how many tanks a specific pump has and their capacities (e.g., MS 15KL, HSD 20KL). The client-side system uses this data to generate the appropriate density and dip-to-volume calculators.
* **Global Kill-Switch**: The "Downtime Mode" acts as a remote lock. When activated here, all client-side systems are instantly restricted to maintenance mode to prevent data entry during updates.

## 🛠️ System Features

* **RBAC (Role-Based Access Control)**: Tiered permissions ensure that only the "Owner" can manage high-level security and team access, while "Staff" focus on station-level updates.
* **Real-time Logic**: Powered by Supabase, any change made in this admin panel—such as adding a tank or changing a password—is pushed to the client-side system instantly without requiring a page refresh.
* **Incident Logging**: Integrated Discord Webhooks provide a live audit log of every configuration change, station deletion, or system status toggle.
* **Data Protection**: Includes CSS-level copy protection and secure PIN-based authentication to prevent unauthorized access to sensitive station configurations.

## 🚀 Deployment for GitHub Pages

To ensure this controller functions as the primary entry point:

1. **Rename `admin.html` to `index.html**` so GitHub Pages serves the dashboard correctly.
2. Ensure `admin.js` and `admin.css` are in the root directory.
3. Configure your Supabase credentials in the `admin.js` constants section.

## 📄 License

Distributed under the **MIT License**.
Copyright (c) 2026 VELOCITY_6097.
