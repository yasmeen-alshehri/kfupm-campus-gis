# kfupm-campus-gis

KFUPM Campus GIS Portal — a role-based campus GIS web app built with the ArcGIS Maps SDK for JavaScript.

**Live demo:** https://kfupm-campus-gis.vercel.app/

## Features

- Home dashboard with live campus statistics
- Embedded ArcGIS Dashboard
- Interactive Campus Map (search, basemap gallery, layer list, legend)
- Admin Panel for editing building data (admin only)
- Light/dark theme
- Role-based access for regular users and Admins

## Tech Stack

- HTML, CSS, JavaScript (no framework)
- ArcGIS Maps SDK for JavaScript
- Hosted on Vercel

## Project Structure

```
.
├── assets/       # Images and static assets
├── app.js        # App logic: auth, routing, map integration, admin editing
├── index.html    # App shell and pages
└── style.css     # Styling and theme
```

## Getting Started

```bash
git clone https://github.com/yasmeen-alshehri/kfupm-campus-gis.git
cd kfupm-campus-gis
npx serve .
```

## Configuration

The `CONFIG` object in `app.js` is already set up with this project's ArcGIS WebMap, Feature Layer, and Dashboard. If you fork or reuse this project, replace those values with your own ArcGIS organization's item IDs and layer URLs.

> **Note:** The map and dashboard content is shared within an ArcGIS organization, not publicly. Visitors without access to that organization may not see the live map or dashboard load.

## Demo Accounts

| Role  | Username | Password   |
|-------|----------|------------|
| User  | `user`   | `user123`  |
| Admin | `admin`  | `admin123` |
