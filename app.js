/* ==========================================================================
   KFUPM Campus GIS Portal
    Uses the ArcGIS Maps SDK for JavaScript
   ========================================================================== */
const CONFIG = {
  WEBMAP_ID: "17cf088a7eaa4e75acb3f75ef6869a49",

  FEATURE_LAYER_URL: "https://services8.arcgis.com/kGkmoj1oFsF1ITzj/arcgis/rest/services/KFUPM_Campus_Map/FeatureServer/2",

  DASHBOARD_URL: "https://www.arcgis.com/apps/dashboards/c2d8fbc618504e76b8177c5d312cc8cf",

  STATISTICS_LAYERS: {
    buildings: "https://services8.arcgis.com/kGkmoj1oFsF1ITzj/arcgis/rest/services/KFUPM_Campus_Map/FeatureServer/2",
    busStops: "https://services8.arcgis.com/kGkmoj1oFsF1ITzj/arcgis/rest/services/KFUPM_Campus_Map/FeatureServer/0",
    busRoutes: "https://services8.arcgis.com/kGkmoj1oFsF1ITzj/arcgis/rest/services/KFUPM_Campus_Map/FeatureServer/1",
  },
};

/* ==========================================================================
   DEMO AUTHENTICATION
   ========================================================================== */
const DEMO_ACCOUNTS = {
  user: { username: "user", password: "user123", role: "user", displayName: "User" },
  admin: { username: "admin", password: "admin123", role: "admin", displayName: "GIS Administrator" },
};

const SESSION_KEY = "kfupm_gis_session";

/* ==========================================================================
   SMALL UTILITIES
   ========================================================================== */
function $(selector, scope = document) { return scope.querySelector(selector); }
function $all(selector, scope = document) { return Array.from(scope.querySelectorAll(selector)); }

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(account) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(account)); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function initials(name) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ==========================================================================
   TOAST NOTIFICATIONS
   ========================================================================== */
const ICONS = {
  success: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4.2-4.2 1.4-1.4 2.8 2.8 6-6 1.4 1.4-7.4 7.4Z"/></svg>',
  error: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z"/></svg>',
  info: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z"/></svg>',
};

function showToast({ type = "info", title, message, duration = 4200 }) {
  const container = $("#toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    ${ICONS[type] || ICONS.info}
    <div class="toast-content">
      <p class="toast-title">${title}</p>
      ${message ? `<p class="toast-msg">${message}</p>` : ""}
    </div>
    <button class="toast-close" aria-label="Dismiss">
      <svg class="icon" viewBox="0 0 24 24" width="14" height="14"><path d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z"/></svg>
    </button>`;
  container.appendChild(toast);

  const remove = () => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 280);
  };
  toast.querySelector(".toast-close").addEventListener("click", remove);
  if (duration) setTimeout(remove, duration);
}

/* ==========================================================================
   THEME (light / dark) — persisted across visits
   ========================================================================== */
function initTheme() {
  const saved = localStorage.getItem("kfupm_theme");
  const theme = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);

  $("#theme-toggle")?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("kfupm_theme", next);
  });
}

/* ==========================================================================
   LOGIN FLOW
   ========================================================================== */
function initLogin() {
  let selectedRole = "user";

  // Role toggle buttons
  $all(".role-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $all(".role-toggle-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      selectedRole = btn.dataset.role;
      $(".role-toggle").classList.toggle("admin-active", selectedRole === "admin");
      // Pre-fill username hint field placeholder for convenience
      const usernameField = $("#login-username");
      usernameField.placeholder = selectedRole === "admin" ? "e.g. admin" : "e.g. user";
    });
  });

  // Password visibility toggle
  $("#password-toggle").addEventListener("click", () => {
    const pwd = $("#login-password");
    pwd.type = pwd.type === "password" ? "text" : "password";
  });

  // Submit handler
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = $("#login-username").value.trim();
    const password = $("#login-password").value;
    const errorEl = $("#login-error");

    const account = Object.values(DEMO_ACCOUNTS).find(
      acc => acc.username === username && acc.password === password && acc.role === selectedRole
    );

    if (!account) {
      errorEl.textContent = `Invalid credentials for the "${selectedRole}" role. Check the demo credentials below.`;
      errorEl.hidden = false;
      $(".login-card").style.animation = "none";
      requestAnimationFrame(() => { $(".login-card").style.animation = "shake 0.4s"; });
      return;
    }

    errorEl.hidden = true;
    setSession(account);
    enterApp(account);
  });

  // Restore existing session (e.g. refresh)
  const existing = getSession();
  if (existing) enterApp(existing, true);
}

// Simple shake keyframes injected once, for invalid login feedback
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `@keyframes shake { 10%,90%{transform:translateX(-1px);} 20%,80%{transform:translateX(2px);} 30%,50%,70%{transform:translateX(-4px);} 40%,60%{transform:translateX(4px);} }`;
document.head.appendChild(shakeStyle);

function enterApp(account) {
  $("#view-login").style.display = "none";
  const shell = $("#app-shell");
  shell.hidden = false;

  // Populate profile info
  const name = account.displayName;
  $("#avatar-initials").textContent = initials(name);
  $("#avatar-initials-lg").textContent = initials(name);
  $("#profile-name").textContent = name;
  $("#profile-dropdown-name").textContent = name;
  $("#profile-dropdown-role").textContent = account.role === "admin" ? "Administrator Account" : "Standard Account";

  // Show/hide admin-only nav & home-page items based on role. Explicitly
  // set `hidden` both ways (not just reveal-if-admin) so the UI is correct
  // even if the DOM was left in a stale state from a previous session.
  $all(".admin-only").forEach(el => (el.hidden = account.role !== "admin"));

  navigateTo(location.hash.replace("#", "") || "home", account.role);
  initMapWhenReady(account.role);
}

function logout() {
  clearSession();
  location.hash = "";
  window.location.reload();
}

/* ==========================================================================
   VIEW ROUTING
   ========================================================================== */
const VALID_VIEWS = ["home", "dashboard", "map", "admin"];

function navigateTo(view, role) {
  if (!VALID_VIEWS.includes(view)) view = "home";
  if (view === "admin" && role !== "admin") {
    // User (or logged-out) users can't reach the Admin page directly,
    // even by typing/pasting the #admin URL — bounce to Home and let them
    // know why.
    showToast({
      type: "error",
      title: "Access Denied",
      message: "You don't have permission to view the Admin Panel.",
    });
    view = "home";
  }

  $all(".view-page").forEach(el => (el.hidden = true));
  $(`#view-${view}`).hidden = false;

  $all(".topnav-link").forEach(link => link.classList.toggle("active", link.dataset.view === view));

  location.hash = view;
  window.scrollTo({ top: 0, behavior: "instant" in document.documentElement.style ? "instant" : "auto" });

  // Close mobile nav drawer if open
  $("#topnav-links")?.classList.remove("open");
  $("#map-sidebar")?.classList.remove("mobile-open");
}

function initRouting() {
  $all("[data-view-link], .topnav-link").forEach(link => {
    link.addEventListener("click", (e) => {
      const view = link.dataset.view || link.dataset.viewLink;
      if (!view) return;
      e.preventDefault();
      const session = getSession();
      navigateTo(view, session?.role);
    });
  });

  window.addEventListener("hashchange", () => {
    const session = getSession();
    navigateTo(location.hash.replace("#", ""), session?.role);
  });
}

/* ==========================================================================
   NAVIGATION CHROME: mobile drawer, profile dropdown
   ========================================================================== */
function initChrome() {
  $("#mobile-nav-toggle").addEventListener("click", () => {
    $("#topnav-links").classList.toggle("open");
  });

  const profileBtn = $("#profile-btn");
  const dropdown = $("#profile-dropdown");
  profileBtn.addEventListener("click", () => {
    const isOpen = !dropdown.hidden;
    dropdown.hidden = isOpen;
    profileBtn.setAttribute("aria-expanded", String(!isOpen));
  });
  document.addEventListener("click", (e) => {
    if (!profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.hidden = true;
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });

  $("#logout-btn").addEventListener("click", logout);

  // Footer year stamps
  const year = new Date().getFullYear();
  $("#year-login") && ($("#year-login").textContent = year);
  $("#year-footer") && ($("#year-footer").textContent = year);
}

/* ==========================================================================
   HOME: animated stat counters — values are queried live from ArcGIS
   Feature Layers (see CONFIG.STATISTICS_LAYERS) rather than hardcoded.
   The count-up animation itself is unchanged; it now simply plays once
   each layer's live count has been retrieved.
   ========================================================================== */

// Fallback values shown only if a layer URL is left as a placeholder, or a
// query fails (e.g. offline), so the Home page never looks broken.
const STAT_FALLBACKS = {
  buildings: 112,
  classrooms: 1840,
  labs: 236,
  busStops: 34,
  busRoutes: 9,
};

let statCounterObserver = null;

function animateStatValue(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  const duration = 900;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target).toLocaleString("en-US");
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Sets up the (shared) IntersectionObserver that triggers the count-up
// animation once a given stat card scrolls into view. Cards are only
// observed once their live data-count has actually been populated.
function getStatCounterObserver() {
  if (statCounterObserver) return statCounterObserver;
  statCounterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateStatValue(entry.target);
        statCounterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });
  return statCounterObserver;
}

function setStatValue(statKey, count) {
  const el = $(`.stat-value[data-stat="${statKey}"]`);
  if (!el) return;
  el.dataset.count = Number.isFinite(count) ? count : (STAT_FALLBACKS[statKey] || 0);
  getStatCounterObserver().observe(el);
}

// Queries a single Feature Layer's live feature count via the ArcGIS
// Maps SDK (FeatureLayer.queryFeatureCount). Falls back to a static demo
// value if the layer URL hasn't been configured yet or the request fails.
function queryLayerCount(FeatureLayer, statKey, url) {
  if (!url || url.includes("_LAYER_URL")) {
    setStatValue(statKey, STAT_FALLBACKS[statKey]);
    return;
  }

  const layer = new FeatureLayer({ url });
  layer.queryFeatureCount()
    .then((count) => setStatValue(statKey, count))
    .catch((err) => {
      console.warn(`Live count failed for "${statKey}" (using fallback):`, err);
      setStatValue(statKey, STAT_FALLBACKS[statKey]);
    });
}

// Buildings, Classrooms and Labs all come from the single Buildings layer:
//  - Buildings = feature count of the layer
//  - Classrooms = SUM of the "Classrooms" attribute across all buildings
//  - Labs = SUM of the "Labs" attribute across all buildings
// Each of the three stats falls back independently so one failure/placeholder
// doesn't block the others.
function queryBuildingsStatistics(FeatureLayer, url) {
  if (!url || url.includes("_LAYER_URL")) {
    setStatValue("buildings", STAT_FALLBACKS.buildings);
    setStatValue("classrooms", STAT_FALLBACKS.classrooms);
    setStatValue("labs", STAT_FALLBACKS.labs);
    return;
  }

  const layer = new FeatureLayer({ url });

  // Total building count
  layer.queryFeatureCount()
    .then((count) => setStatValue("buildings", count))
    .catch((err) => {
      console.warn('Live count failed for "buildings" (using fallback):', err);
      setStatValue("buildings", STAT_FALLBACKS.buildings);
    });

  // Sum of Classrooms and Labs attributes across all building features
  layer.queryFeatures({
    where: "1=1",
    outStatistics: [
      { onStatisticField: "Classrooms", outStatisticFieldName: "classroomsSum", statisticType: "sum" },
      { onStatisticField: "Labs", outStatisticFieldName: "labsSum", statisticType: "sum" },
    ],
    returnGeometry: false,
  })
    .then((result) => {
      const attrs = result.features?.[0]?.attributes || {};
      setStatValue("classrooms", attrs.classroomsSum);
      setStatValue("labs", attrs.labsSum);
    })
    .catch((err) => {
      console.warn('Live Classrooms/Labs sum failed (using fallback):', err);
      setStatValue("classrooms", STAT_FALLBACKS.classrooms);
      setStatValue("labs", STAT_FALLBACKS.labs);
    });
}

// Entry point: called on app load to populate all five Home page
// statistics. Buildings/Classrooms/Labs come from the Buildings layer;
// Bus Stops and Bus Routes come from their own layers.
function loadHomeStatistics() {
  if (typeof require === "undefined") {
    // ArcGIS SDK not available (e.g. offline) — show fallback values.
    Object.keys(STAT_FALLBACKS).forEach(key => setStatValue(key, STAT_FALLBACKS[key]));
    return;
  }

  require(["esri/layers/FeatureLayer"], (FeatureLayer) => {
    const layers = CONFIG.STATISTICS_LAYERS;
    queryBuildingsStatistics(FeatureLayer, layers.buildings);
    queryLayerCount(FeatureLayer, "busStops", layers.busStops);
    queryLayerCount(FeatureLayer, "busRoutes", layers.busRoutes);
  });
}

/* ==========================================================================
   DASHBOARD VIEW
   ========================================================================== */
function initDashboard() {
  const iframe = $("#dashboard-iframe");
  const loading = $("#dashboard-loading");
  const emptyState = $("#dashboard-empty-state");
  const wrap = $("#dashboard-frame-wrap");
  iframe.src = CONFIG.DASHBOARD_URL;

  if (!CONFIG.DASHBOARD_URL || CONFIG.DASHBOARD_URL === "DASHBOARD_URL") {
    loading.classList.add("hide");
    iframe.style.display = "none";
    emptyState.hidden = false;
  } else {
    iframe.addEventListener("load", () => {
      loading.classList.add("hide");
      emptyState.hidden = true;
    });

    iframe.addEventListener("error", () => {
      loading.classList.add("hide");
      emptyState.hidden = false;
    });
  }

  $("#dashboard-refresh").addEventListener("click", () => {
    if (!CONFIG.DASHBOARD_URL || CONFIG.DASHBOARD_URL === "DASHBOARD_URL") {
      showToast({ type: "info", title: "Dashboard not configured", message: "Set DASHBOARD_URL in app.js first." });
      return;
    }
    loading.classList.remove("hide");
    iframe.src = iframe.src; // eslint-disable-line no-self-assign
  });

  $("#dashboard-fullscreen").addEventListener("click", () => {
    if (wrap.requestFullscreen) wrap.requestFullscreen();
    else showToast({ type: "info", title: "Fullscreen unavailable", message: "Your browser does not support this feature." });
  });
}

/* ==========================================================================
   ARCGIS MAP INTEGRATION
   Uses the AMD `require` loader exposed globally by js.arcgis.com.
   Builds a public "Campus Map" (read-only) and, for admins, an editable
   "Admin Map" wired to FeatureLayer.applyEdits().
   ========================================================================== */
let publicMapInitialized = false;
let adminMapInitialized = false;
let publicLayerView = null;       // LayerView for the Buildings layer, used to draw the highlight (Campus Map page)
let publicHighlightHandle = null; // handle returned by layerView.highlight(), removed before re-highlighting

function initMapWhenReady(role) {
  // Initialize the public campus map once the Maps view becomes visible for the first time.
  const mapLink = $('.topnav-link[data-view="map"]');
  mapLink?.addEventListener("click", () => { if (!publicMapInitialized) buildPublicMap(); }, { once: false });
  if (location.hash === "#map") buildPublicMap();

  if (role === "admin") {
    const adminLink = $('.topnav-link[data-view="admin"]');
    adminLink?.addEventListener("click", () => { if (!adminMapInitialized) buildAdminMap(); });
    if (location.hash === "#admin") buildAdminMap();
  }

  $("#map-sidebar-collapse")?.addEventListener("click", () => {
    $("#map-sidebar").classList.toggle("collapsed");
    $("#map-sidebar-collapse").classList.toggle("collapsed");
  });
}

function buildPublicMap() {
  if (publicMapInitialized || typeof require === "undefined") return;
  publicMapInitialized = true;

  require([
    "esri/intl",
    "esri/WebMap",
    "esri/views/MapView",
    "esri/widgets/Search",
    "esri/widgets/LayerList",
    "esri/widgets/Legend",
    "esri/widgets/BasemapGallery",
    "esri/widgets/Expand",
  ], (intl, WebMap, MapView, Search, LayerList, Legend, BasemapGallery, Expand) => {

    intl.setLocale("en");


    const webmap = new WebMap({ portalItem: { id: CONFIG.WEBMAP_ID } });

    webmap.when(() => {
      console.log(webmap.layers.items);
    });

    const view = new MapView({
      container: "campus-map",
      map: webmap,
      center: [50.1524, 26.3059],
      zoom: 16,
      popupEnabled: false,
    });

    window.view = view;

    view.when(() => {
      $("#map-loading").classList.add("hide");
    }, (err) => {
      // Placeholder WEBMAP_ID or load failure — keep UI usable and inform the user.
      $("#map-loading").classList.add("hide");
      showToast({ type: "info", title: "Campus map not configured", message: "Set WEBMAP_ID in app.js to load the live map." });
      console.warn("WebMap failed to load (expected while WEBMAP_ID is a placeholder):", err);
    });

    // Search widget (embedded in sidebar)
    const search = new Search({
      view,
      container: "map-search",
      includeDefaultSources: true,
      allPlaceholder: "Search for a building..."
    });

    // Basemap gallery
    new BasemapGallery({ view, container: "map-basemap-gallery" });

    // Layer list
    new LayerList({ view, container: "map-layer-list" });

    // Legend
    new Legend({ view, container: "map-legend" });

    // Building click → open read-only info panel
    view.on("click", async (event) => {
      const response = await view.hitTest(event);

      const result = response.results.find(
        r => r.graphic &&
          r.graphic.layer &&
          r.graphic.layer.title === "Buildings"
      );

      if (!result) return;

      const buildingsLayer = result.graphic.layer;

      // Highlight the selected building. The LayerView is resolved once
      // (lazily, on first click) and cached; any previous highlight is
      // removed first so only one building is ever highlighted at a time.
      if (!publicLayerView) {
        publicLayerView = await view.whenLayerView(buildingsLayer);
      }
      if (publicHighlightHandle) {
        publicHighlightHandle.remove();
        publicHighlightHandle = null;
      }
      publicHighlightHandle = publicLayerView.highlight(result.graphic);

      const query = buildingsLayer.createQuery();
      query.objectIds = [result.graphic.attributes.OBJECTID];
      query.outFields = ["*"];
      query.returnGeometry = false;

      try {
        const featureSet = await buildingsLayer.queryFeatures(query);

        if (featureSet.features.length > 0) {
          console.log(featureSet.features[0].attributes);
          showBuildingInfoPanel(featureSet.features[0].attributes);
        }
      } catch (err) {
        console.error(err);
      }
    });
  });

  $("#info-panel-close").addEventListener("click", () => {
    $("#building-info-panel").hidden = true;

    if (publicHighlightHandle) {
      publicHighlightHandle.remove();
      publicHighlightHandle = null;
    }
  });
}

function showBuildingInfoPanel(attrs = {}) {
  const panel = $("#building-info-panel");

  $("#info-panel-title").textContent =
    attrs.Building_Name || attrs.NAME || "Building";

  $("#info-type").textContent =
    attrs.Building_Type ?? "—";

  $("#info-floors").textContent =
    attrs.Floors ?? "—";

  $("#info-classrooms").textContent =
    attrs.Classrooms ?? "—";

  $("#info-labs").textContent =
    attrs.Labs ?? "—";

  $("#info-courses").textContent =
    attrs.Courses ?? "—";

  $("#info-sections").textContent =
    attrs.Sections ?? "—";

  panel.hidden = false;
}

/* ==========================================================================
   ADMIN MAP + EDIT FORM (FeatureLayer.applyEdits)
   ========================================================================== */
let adminFeatureLayer = null;
let adminSelectedGraphic = null;
let adminLayerView = null;       // LayerView for the Buildings layer, used to draw the highlight
let adminHighlightHandle = null; // handle returned by layerView.highlight(), removed before re-highlighting
let adminTypeField = null;       // the Building_Type field definition (holds its coded value domain)

// Display formatting only — a real value (including 0) is shown as-is;
// only a truly null/undefined/empty value falls back to "N/A".
function formatAttr(value) {
  return (value === null || value === undefined || value === "") ? "N/A" : value;
}

/* ---- Building Type dropdown, driven entirely by the Feature Layer's own
   coded value domain --------------------------------------------------------
   The Feature Layer (not this code) owns the list of valid building types.
   We read the domain straight off the Building_Type field definition and use
   it to build the <option> list, so renaming, adding, or removing coded
   values in ArcGIS Pro/Online is reflected here automatically — nothing to
   update in this file. */
async function populateBuildingTypeOptions(layer) {
  const select = $("#admin-field-type");
  if (!select) return;

  // Field metadata (including domains) is guaranteed available once the
  // layer has finished loading.
  await layer.load();

  const field = layer.fields.find(f => f.name === "Building_Type");
  const domain = field?.domain;

  if (!field || !domain || domain.type !== "coded-value") {
    console.warn('"Building_Type" has no coded value domain on this Feature Layer — leaving the dropdown empty.');
    showToast({
      type: "info",
      title: "Building Type domain not found",
      message: 'The "Building_Type" field has no coded value domain in this Feature Layer.',
    });
    return;
  }

  adminTypeField = field; // remembered so we can cast the value correctly on save

  select.innerHTML = "";
  domain.codedValues.forEach(({ code, name }) => {
    const option = document.createElement("option");
    option.value = code;        // the raw value stored in the Feature Layer
    option.textContent = name;  // the human-readable label shown to the admin
    select.appendChild(option);
  });
}

// Coded value domains are just as often defined on numeric fields as on text
// fields. Cast the <select>'s (always-string) value back to a Number when
// the field itself is numeric, so applyEdits writes back the exact type the
// domain — and the Feature Layer schema — expects.
const NUMERIC_DOMAIN_FIELD_TYPES = new Set(["small-integer", "integer", "single", "double", "long"]);
function castToFieldType(rawValue, field) {
  return field && NUMERIC_DOMAIN_FIELD_TYPES.has(field.type) ? Number(rawValue) : rawValue;
}

// Looks up the human-readable label for a raw coded value (e.g. turns the
// stored code into "Laboratory"). Falls back to the raw value itself if the
// field has no domain or the code isn't found, so it's always safe to call.
function getDomainLabel(rawValue, field) {
  const codedValues = field?.domain?.codedValues;
  if (!codedValues) return rawValue;
  const match = codedValues.find(cv => cv.code === rawValue || String(cv.code) === String(rawValue));
  return match ? match.name : rawValue;
}
function buildAdminMap() {
  if (adminMapInitialized || typeof require === "undefined") return;
  adminMapInitialized = true;

  require([
    "esri/intl",
    "esri/WebMap",
    "esri/views/MapView",
  ], (intl, WebMap, MapView) => {

    intl.setLocale("en");

    const webmap = new WebMap({
      portalItem: {
        id: CONFIG.WEBMAP_ID
      }
    });
    const view = new MapView({
      container: "admin-map",
      map: webmap,
      center: [50.1524, 26.3059],
      zoom: 16,
      popupEnabled: false,
    });

    view.when(async () => {

      $("#admin-map-loading").classList.add("hide");

      await webmap.load();

      // IMPORTANT: `webmap.layers` only lists TOP-LEVEL layers. If the
      // Buildings layer sits inside a GroupLayer (very common in webmaps
      // authored in ArcGIS Online), `webmap.layers.find(...)` silently
      // returns undefined and `adminFeatureLayer` is never set — which is
      // why clicks on the map never selected anything. `webmap.allLayers`
      // walks into every GroupLayer and returns a flattened collection, so
      // the Buildings layer is found no matter how the map is organized.
      console.log("Layers:", webmap.allLayers.map(layer => ({
        title: layer.title,
        id: layer.id
      })).toArray());

      adminFeatureLayer = webmap.allLayers.find(
        layer => layer.title === "Buildings"
      );

      if (adminFeatureLayer) {
        // Cache the LayerView so selected buildings can be highlighted.
        adminLayerView = await view.whenLayerView(adminFeatureLayer);
        // Build the Building Type dropdown from the field's own coded value domain.
        await populateBuildingTypeOptions(adminFeatureLayer);
      } else {
        showToast({
          type: "info",
          title: "Buildings layer not found",
          message: 'No layer titled "Buildings" exists in this WebMap.',
        });
      }

    }, (err) => {

      $("#admin-map-loading").classList.add("hide");

      showToast({
        type: "info",
        title: "Admin map not configured",
        message: "Unable to load the WebMap."
      });

      console.warn(err);

    });

    view.on("click", (event) => {
      // Nothing to select against until the Buildings layer has finished loading.
      if (!adminFeatureLayer) return;

      // Restrict hitTest itself to the Buildings layer via `include`, rather
      // than testing every layer and filtering afterwards. This guarantees
      // clicks on roads, labels, bus stops/routes, basemap features, or any
      // other layer are never considered a hit — it's handled by the hitTest
      // call itself, not a workaround bolted on after the fact.
      view.hitTest(event, { include: adminFeatureLayer }).then((response) => {
        const result = response.results.find(
          r => r.type === "graphic" && r.graphic && r.graphic.layer === adminFeatureLayer
        );
        if (result) selectAdminBuilding(result.graphic);
      });
    });
  });

  initAdminForm();
}

/* ---- Selecting a building: highlight it + populate the form + side panel ----
   ROOT CAUSE FIX: a graphic returned by hitTest only carries whatever
   attributes the layer's renderer/labels already needed client-side — not
   necessarily every field in the layer. The Campus Map page
   (buildPublicMap/showBuildingInfoPanel) never has this problem because it
   re-queries the full feature with outFields: ["*"] before displaying it.
   We reuse that exact same query here instead of trusting the (possibly
   partial) attributes hitTest gave us. */
async function selectAdminBuilding(graphic) {

  if (adminHighlightHandle) {
    adminHighlightHandle.remove();
    adminHighlightHandle = null;
  }

  // Highlight uses the original hitTest graphic — it already has geometry.
  if (adminLayerView) {
    adminHighlightHandle = adminLayerView.highlight(graphic);
  }

  const query = adminFeatureLayer.createQuery();
  query.objectIds = [graphic.attributes.OBJECTID];
  query.outFields = ["*"];
  query.returnGeometry = false;

  try {
    const featureSet = await adminFeatureLayer.queryFeatures(query);
    if (!featureSet.features.length) return;

    const fullGraphic = featureSet.features[0];

    // Logs the full, freshly-queried attributes — same data the Campus Map
    // page's console.log shows — so real field names can be double-checked.
    console.log("Selected building attributes:", fullGraphic.attributes);

    loadBuildingIntoEditForm(fullGraphic);
  } catch (err) {
    console.error(err);
  }
}

function loadBuildingIntoEditForm(graphic) {
  adminSelectedGraphic = graphic;
  const a = graphic.attributes || {};

  // Same attribute names the Campus Map page already reads successfully
  // (see showBuildingInfoPanel/buildPublicMap) — reused as-is, no guessing.
  const buildingName = a.Building_Name || a.NAME || "";

  // Header requirement: swap the static title for the selected building's name.
  $("#admin-panel-title").textContent = buildingName || "Edit Building";

  $("#admin-field-id").value = formatAttr(a.Building_ID ?? a.OBJECTID);
  $("#admin-field-name").value = buildingName;
  $("#admin-field-type").value = a.Building_Type ?? "";
  $("#admin-field-floors").value = a.Floors ?? "";
  $("#admin-field-classrooms").value = formatAttr(a.Classrooms);
  $("#admin-field-labs").value = formatAttr(a.Labs);
  $("#admin-field-courses").value = formatAttr(a.Courses);
  $("#admin-field-sections").value = formatAttr(a.Sections);

  // Keep the left-hand Building Details panel in sync with the selection.
  updateBuildingDetailsPanel(a);
}

function resetAdminForm() {
  adminSelectedGraphic = null;
  $("#admin-edit-form").reset();
  $("#admin-panel-title").textContent = "Edit Building";

  if (adminHighlightHandle) {
    adminHighlightHandle.remove();
    adminHighlightHandle = null;
  }

  updateBuildingDetailsPanel(null);
}

/* ==========================================================================
   ADMIN LEFT PANEL — "Building Details" cards
   Reads the exact same attribute names as loadBuildingIntoEditForm() above
   (which in turn match showBuildingInfoPanel() on the Campus Map page), from
   the same fully-queried `attrs` object, so the two panels can never drift
   out of sync. Pass `null` to restore the friendly placeholder (no building
   selected).
   ========================================================================== */
function updateBuildingDetailsPanel(attrs) {
  const emptyState = $("#details-empty-state");
  const content = $("#details-content");
  if (!emptyState || !content) return;

  if (!attrs) {
    emptyState.hidden = false;
    content.hidden = true;
    return;
  }

  $("#detail-name").textContent = formatAttr(attrs.Building_Name || attrs.NAME);
  $("#detail-id").textContent = formatAttr(attrs.Building_ID ?? attrs.OBJECTID);
  $("#detail-type").textContent = formatAttr(getDomainLabel(attrs.Building_Type, adminTypeField));
  $("#detail-floors").textContent = formatAttr(attrs.Floors);
  $("#detail-classrooms").textContent = formatAttr(attrs.Classrooms);
  $("#detail-labs").textContent = formatAttr(attrs.Labs);
  $("#detail-sections").textContent = formatAttr(attrs.Sections);

  emptyState.hidden = true;
  content.hidden = false;
}

function initAdminForm() {
  $("#admin-cancel-btn").addEventListener("click", resetAdminForm);

  $("#admin-edit-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (!adminSelectedGraphic) return;
    openConfirmModal();
  });
}

/* ---- Confirmation modal ---- */
function openConfirmModal() {
  $("#confirm-modal").hidden = false;
}
function closeConfirmModal() {
  $("#confirm-modal").hidden = true;
}

function initConfirmModal() {
  $("#confirm-modal-cancel").addEventListener("click", closeConfirmModal);
  $("#confirm-modal").addEventListener("click", (e) => {
    if (e.target.id === "confirm-modal") closeConfirmModal();
  });
  $("#confirm-modal-accept").addEventListener("click", saveBuildingEdits);
}

function saveBuildingEdits() {
  if (!adminSelectedGraphic || !adminFeatureLayer) {
    closeConfirmModal();
    return;
  }

  const saveBtn = $("#admin-save-btn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  const updatedGraphic = adminSelectedGraphic.clone();
  const attrs = updatedGraphic.attributes;

  // Same field names read in loadBuildingIntoEditForm() / showBuildingInfoPanel()
  // — writing back to the exact names we read from, not a different guessed set.
  const nameValue = $("#admin-field-name").value;
  attrs.Building_Name = nameValue;
  attrs.Building_Type = castToFieldType($("#admin-field-type").value, adminTypeField);
  attrs.Floors = Number($("#admin-field-floors").value) || 0;

  adminFeatureLayer.applyEdits({ updateFeatures: [updatedGraphic] })
    .then((result) => {
      console.log(result);
      closeConfirmModal();
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";

      const failed = result.updateFeatureResults?.some(r => r.error);
      if (failed) {
        showToast({ type: "error", title: "Save failed", message: "The feature layer rejected the update. Check field types and permissions." });
      } else {
        showToast({ type: "success", title: "Building updated", message: `${nameValue || "Building"} was saved successfully.` });

        const query = adminFeatureLayer.createQuery();
        query.objectIds = [updatedGraphic.attributes.OBJECTID];
        query.outFields = ["*"];
        query.returnGeometry = false;

        adminFeatureLayer.queryFeatures(query).then((featureSet) => {
          if (featureSet.features.length) {
            adminSelectedGraphic = featureSet.features[0];
            loadBuildingIntoEditForm(adminSelectedGraphic);
          }
        });
      }
    })
    .catch((err) => {
      closeConfirmModal();
      saveBtn.disabled = false;
      saveBtn.textContent = "Save Changes";

      console.error("applyEdits error:", err);

      showToast({
        type: "error",
        title: "Save failed",
        message: err.message || "Unknown error"
      });
    });
}

/* ==========================================================================
   APP BOOTSTRAP
   ========================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initLogin();
  initRouting();
  initChrome();
  loadHomeStatistics();
  initDashboard();
  initConfirmModal();

  // Hide the loading screen once the shell is ready
  setTimeout(() => {
    $("#loading-screen").classList.add("hide");
  }, 600);
});
