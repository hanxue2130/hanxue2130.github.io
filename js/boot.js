const scripts = [
  "https://code.jquery.com/jquery-3.6.0.min.js",
  "https://cdn.jsdelivr.net/npm/bootstrap@4/dist/js/bootstrap.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/nprogress@0/nprogress.min.js",
  "https://cdn.jsdelivr.net/npm/typed.js@2/lib/typed.min.js",
  "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
];

scripts.forEach(function (src) {
  const script = document.createElement("script");
  script.src = src;
  script.async = false;
  document.head.appendChild(script);
});

const MANUAL_THEME_SELECTION_KEY = "manual-theme-selection";
let currentWeatherTheme = null;
let weatherThemeNoteIntervalId = null;
let weatherThemeNoteHideTimerId = null;
let currentWeatherMotionThemeKey = "";

const THEME_PRESETS = {
  sunny: { key: "sunny", mode: "light", label: "Sunny Theme", icon: "fas fa-sun", accent: "#f4b400" },
  cloudy: { key: "cloudy", mode: "light", label: "Cloudy Theme", icon: "fas fa-cloud-sun", accent: "#86afcf" },
  overcast: { key: "overcast", mode: "dark", label: "Overcast Theme", icon: "fas fa-cloud", accent: "#708ca6" },
  misty: { key: "misty", mode: "dark", label: "Misty Theme", icon: "fas fa-smog", accent: "#96a8bc" },
  drizzle: { key: "drizzle", mode: "dark", label: "Drizzle Theme", icon: "fas fa-cloud-rain", accent: "#6eb5d8" },
  rainy: { key: "rainy", mode: "dark", label: "Rainy Theme", icon: "fas fa-cloud-rain", accent: "#5ca2d1" },
  breezy: { key: "breezy", mode: "light", label: "Breezy Theme", icon: "fas fa-wind", accent: "#8bc9e8" },
  windy: { key: "windy", mode: "dark", label: "Windy Theme", icon: "fas fa-wind", accent: "#61b0d3" },
  snowy: { key: "snowy", mode: "light", label: "Snowy Theme", icon: "fas fa-snowflake", accent: "#79b8e8" },
  storm: { key: "storm", mode: "dark", label: "Storm Theme", icon: "fas fa-bolt", accent: "#8c7dff" }
};

const THEME_SELECTION_ORDER = ["auto", "sunny", "cloudy", "overcast", "misty", "drizzle", "rainy", "breezy", "windy", "snowy", "storm"];

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function ensureWeatherMotionLayer() {
  let layer = document.getElementById("weather-motion-layer");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "weather-motion-layer";
    document.body.appendChild(layer);
  }
  return layer;
}

function clearWeatherMotionLayer(layer) {
  layer.innerHTML = "";
  layer.className = "";
}

function addRainDrops(layer, count) {
  for (let i = 0; i < count; i += 1) {
    const drop = document.createElement("span");
    drop.className = "weather-motion-drop";
    drop.style.left = randomBetween(0, 100).toFixed(2) + "%";
    drop.style.animationDelay = randomBetween(0, 2.4).toFixed(2) + "s";
    drop.style.animationDuration = randomBetween(0.8, 1.35).toFixed(2) + "s";
    drop.style.opacity = randomBetween(0.2, 0.6).toFixed(2);
    drop.style.height = randomBetween(12, 26).toFixed(0) + "px";
    layer.appendChild(drop);
  }
}

function addSnowFlakes(layer, count) {
  for (let i = 0; i < count; i += 1) {
    const flake = document.createElement("span");
    flake.className = "weather-motion-flake";
    flake.style.left = randomBetween(0, 100).toFixed(2) + "%";
    flake.style.animationDelay = randomBetween(0, 4).toFixed(2) + "s";
    flake.style.animationDuration = randomBetween(4, 8).toFixed(2) + "s";
    flake.style.opacity = randomBetween(0.25, 0.8).toFixed(2);
    const size = randomBetween(2, 5).toFixed(1) + "px";
    flake.style.width = size;
    flake.style.height = size;
    layer.appendChild(flake);
  }
}

function addFogClouds(layer, count) {
  for (let i = 0; i < count; i += 1) {
    const cloud = document.createElement("span");
    cloud.className = "weather-motion-fog";
    cloud.style.top = randomBetween(8, 75).toFixed(2) + "%";
    cloud.style.left = randomBetween(-20, 80).toFixed(2) + "%";
    cloud.style.animationDelay = randomBetween(0, 6).toFixed(2) + "s";
    cloud.style.animationDuration = randomBetween(12, 26).toFixed(2) + "s";
    cloud.style.opacity = randomBetween(0.08, 0.2).toFixed(2);
    cloud.style.width = randomBetween(160, 360).toFixed(0) + "px";
    cloud.style.height = randomBetween(40, 85).toFixed(0) + "px";
    layer.appendChild(cloud);
  }
}

function addWindLines(layer, count) {
  for (let i = 0; i < count; i += 1) {
    const line = document.createElement("span");
    line.className = "weather-motion-wind";
    line.style.top = randomBetween(10, 90).toFixed(2) + "%";
    line.style.left = randomBetween(-40, 70).toFixed(2) + "%";
    line.style.animationDelay = randomBetween(0, 3).toFixed(2) + "s";
    line.style.animationDuration = randomBetween(2.8, 5.2).toFixed(2) + "s";
    line.style.opacity = randomBetween(0.14, 0.42).toFixed(2);
    line.style.width = randomBetween(60, 180).toFixed(0) + "px";
    layer.appendChild(line);
  }
}

function addSunGlow(layer) {
  const glow = document.createElement("span");
  glow.className = "weather-motion-sun";
  layer.appendChild(glow);
}

function updateWeatherMotion(themeKey) {
  if (!document.body) {
    return;
  }
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const existingLayer = document.getElementById("weather-motion-layer");
    if (existingLayer) {
      existingLayer.remove();
    }
    currentWeatherMotionThemeKey = "";
    return;
  }

  if (currentWeatherMotionThemeKey === themeKey) {
    return;
  }

  const layer = ensureWeatherMotionLayer();
  clearWeatherMotionLayer(layer);
  currentWeatherMotionThemeKey = themeKey;

  layer.classList.add("weather-motion-layer", "theme-" + themeKey);

  if (themeKey === "rainy") {
    addRainDrops(layer, 72);
    return;
  }
  if (themeKey === "drizzle") {
    addRainDrops(layer, 42);
    addFogClouds(layer, 2);
    return;
  }
  if (themeKey === "storm") {
    addRainDrops(layer, 92);
    addWindLines(layer, 10);
    return;
  }
  if (themeKey === "snowy") {
    addSnowFlakes(layer, 55);
    return;
  }
  if (themeKey === "misty" || themeKey === "cloudy" || themeKey === "overcast") {
    addFogClouds(layer, themeKey === "misty" ? 5 : 3);
    return;
  }
  if (themeKey === "breezy" || themeKey === "windy") {
    addWindLines(layer, themeKey === "windy" ? 16 : 10);
    return;
  }
  if (themeKey === "sunny") {
    addSunGlow(layer);
  }
}

function isThemeNoteEnabledForPage() {
  const normalizedPath = (window.location.pathname || "").replace(/\/+$/, "") || "/";
  return normalizedPath === "/" || normalizedPath === "/index.html";
}

function getHeaderWeatherDescription(code) {
  const map = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Mist",
    48: "Dense mist",
    51: "Light drizzle",
    53: "Drizzle",
    55: "Heavy drizzle",
    61: "Rain",
    63: "Steady rain",
    65: "Heavy rain",
    66: "Freezing rain",
    67: "Heavy freezing rain",
    71: "Light snow",
    73: "Snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Showers",
    81: "Showers",
    82: "Heavy showers",
    85: "Snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunder + hail",
    99: "Severe thunder + hail"
  };
  return map[code] || "Weather";
}

function getHeaderWeatherIconClass(code) {
  if (code === 0 || code === 1) return "fas fa-sun";
  if (code === 2 || code === 3) return "fas fa-cloud-sun";
  if (code === 45 || code === 48) return "fas fa-smog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "fas fa-cloud-rain";
  if (code >= 71 && code <= 77) return "fas fa-snowflake";
  if (code >= 95) return "fas fa-bolt";
  return "fas fa-cloud";
}

function resolveThemeFromWeather(code, windSpeed) {
  const wind = Number.isFinite(windSpeed) ? windSpeed : 0;
  if ((code === 0 || code === 1 || code === 2 || code === 3) && wind >= 30) {
    return THEME_PRESETS.windy;
  }
  if ((code === 0 || code === 1 || code === 2 || code === 3) && wind >= 18) {
    return THEME_PRESETS.breezy;
  }
  if (code === 0 || code === 1) {
    return THEME_PRESETS.sunny;
  }
  if (code === 2) {
    return THEME_PRESETS.cloudy;
  }
  if (code === 3) {
    return THEME_PRESETS.overcast;
  }
  if (code === 45 || code === 48) {
    return THEME_PRESETS.misty;
  }
  if (code === 51 || code === 53 || code === 55) {
    return THEME_PRESETS.drizzle;
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return THEME_PRESETS.rainy;
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return THEME_PRESETS.snowy;
  }
  if (code === 95 || code === 96 || code === 99) {
    return THEME_PRESETS.storm;
  }
  return THEME_PRESETS.cloudy;
}

function applyWeatherTheme(theme, modeOverride) {
  const mode = modeOverride === "light" || modeOverride === "dark" ? modeOverride : theme.mode;
  document.documentElement.setAttribute("data-default-color-scheme", mode);
  document.documentElement.setAttribute("data-weather-theme", theme.key);
  document.documentElement.style.setProperty("--weather-accent", theme.accent);
  updateWeatherMotion(theme.key);
}

function getThemeSelection() {
  try {
    const value = localStorage.getItem(MANUAL_THEME_SELECTION_KEY);
    if (value === "auto" || (value && THEME_PRESETS[value])) {
      return value;
    }
  } catch (error) {
    // Ignore browser storage restrictions.
  }
  return "auto";
}

function setThemeSelection(selection) {
  try {
    if (selection === "auto" || (selection && THEME_PRESETS[selection])) {
      localStorage.setItem(MANUAL_THEME_SELECTION_KEY, selection);
    } else {
      localStorage.setItem(MANUAL_THEME_SELECTION_KEY, "auto");
    }
  } catch (error) {
    // Ignore browser storage restrictions.
  }
}

function updateThemeButtonLabel(selection) {
  const btn = document.getElementById("user-theme-btn");
  if (!btn) {
    return;
  }
  if (selection && selection !== "auto" && THEME_PRESETS[selection]) {
    const selectedTheme = THEME_PRESETS[selection];
    btn.innerHTML = "<i class=\"" + selectedTheme.icon + "\"></i> Theme: " + selectedTheme.label.replace(" Theme", "");
    return;
  }
  btn.innerHTML = '<i class="fas fa-adjust"></i> Theme: Auto';
}

function applyThemeSelection(selection) {
  if (!currentWeatherTheme) {
    return;
  }
  if (selection && selection !== "auto" && THEME_PRESETS[selection]) {
    applyWeatherTheme(THEME_PRESETS[selection]);
    return;
  }
  applyWeatherTheme(currentWeatherTheme);
}

function showTimedWeatherThemeNote(baseText, iconClass) {
  if (!isThemeNoteEnabledForPage()) {
    return;
  }

  let note = document.getElementById("weather-theme-note");
  if (!note) {
    note = document.createElement("div");
    note.id = "weather-theme-note";
    note.className = "weather-theme-note";
    document.body.appendChild(note);
  }
  note.classList.remove("is-hiding");

  if (weatherThemeNoteIntervalId) {
    window.clearInterval(weatherThemeNoteIntervalId);
    weatherThemeNoteIntervalId = null;
  }
  if (weatherThemeNoteHideTimerId) {
    window.clearTimeout(weatherThemeNoteHideTimerId);
    weatherThemeNoteHideTimerId = null;
  }

  let remaining = 5;
  function render() {
    note.innerHTML = "<i class=\"" + iconClass + "\"></i> "
      + baseText
      + " • hides in "
      + String(remaining)
      + "s";
  }
  render();

  weatherThemeNoteIntervalId = window.setInterval(function () {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(weatherThemeNoteIntervalId);
      weatherThemeNoteIntervalId = null;
      note.classList.add("is-hiding");
      weatherThemeNoteHideTimerId = window.setTimeout(function () {
        if (note && note.parentNode) {
          note.parentNode.removeChild(note);
        }
      }, 280);
      return;
    }
    render();
  }, 1000);
}

function setHeaderWeatherFallback(weatherEl) {
  weatherEl.innerHTML = '<i class="fas fa-map-marker-alt"></i> Weather unavailable';
}

function renderHeaderWeather(weatherEl, city, code, temp) {
  const icon = document.createElement("i");
  icon.className = getHeaderWeatherIconClass(code);
  const temperatureText = Number.isFinite(temp) ? temp.toFixed(1) + "°C" : "-";
  const weatherText = city + " " + temperatureText + " · " + getHeaderWeatherDescription(code);
  weatherEl.innerHTML = "";
  weatherEl.appendChild(icon);
  weatherEl.appendChild(document.createTextNode(" " + weatherText));
}

async function loadHeaderLocalWeather() {
  const weatherEl = document.getElementById("header-local-weather");
  if (!weatherEl || weatherEl.dataset.weatherLoaded === "true") {
    return;
  }
  weatherEl.dataset.weatherLoaded = "true";

  try {
    const locationResponse = await fetch("https://ipapi.co/json/");
    if (!locationResponse.ok) throw new Error("Location lookup failed");
    const location = await locationResponse.json();
    const lat = Number(location.latitude);
    const lon = Number(location.longitude);
    const city = location.city || location.region || location.country_name || "Your location";
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Coordinates unavailable");

    const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude="
      + encodeURIComponent(lat)
      + "&longitude="
      + encodeURIComponent(lon)
      + "&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto";
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("Weather lookup failed");
    const payload = await weatherResponse.json();
    const current = payload && payload.current ? payload.current : null;
    if (!current) throw new Error("Weather data unavailable");

    const code = Number(current.weather_code);
    const temperature = Number(current.temperature_2m);
    const windSpeed = Number(current.wind_speed_10m);
    const weatherTheme = resolveThemeFromWeather(code, windSpeed);
    currentWeatherTheme = weatherTheme;
    applyThemeSelection(getThemeSelection());
    renderHeaderWeather(weatherEl, city, code, temperature);
    showTimedWeatherThemeNote(
      weatherTheme.label + " • based on " + city + " weather",
      weatherTheme.icon
    );
  } catch (error) {
    const fallbackTheme = { key: "cloudy", mode: "dark", label: "Default Theme", icon: "fas fa-cloud", accent: "#7ca5c7" };
    currentWeatherTheme = fallbackTheme;
    applyThemeSelection(getThemeSelection());
    setHeaderWeatherFallback(weatherEl);
    showTimedWeatherThemeNote("Default Theme • weather data unavailable", fallbackTheme.icon);
  }
}

function initScrollProgress() {
  if (document.getElementById("scroll-progress")) {
    return;
  }
  const progress = document.createElement("div");
  progress.id = "scroll-progress";
  document.body.appendChild(progress);

  function updateProgress() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const ratio = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progress.style.width = ratio.toFixed(2) + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
}

function animateCount(el) {
  const target = Number(el.getAttribute("data-count-to"));
  if (!Number.isFinite(target) || el.dataset.countDone === "true") {
    return;
  }
  el.dataset.countDone = "true";
  const duration = 1200;
  const startAt = window.performance.now();

  function tick(now) {
    const progress = Math.min((now - startAt) / duration, 1);
    const value = Math.floor(progress * target);
    el.textContent = String(value);
    if (progress < 1) {
      window.requestAnimationFrame(tick);
    } else {
      el.textContent = String(target);
    }
  }
  window.requestAnimationFrame(tick);
}

function initRevealAnimations() {
  const revealElements = document.querySelectorAll("[data-reveal], .resume-hero, .resume-section, .data-card, .project-panel");
  if (!revealElements.length) {
    return;
  }
  if (!("IntersectionObserver" in window)) {
    revealElements.forEach(function (el) {
      el.classList.add("is-revealed");
      const counters = el.querySelectorAll("[data-count-to]");
      counters.forEach(animateCount);
    });
    return;
  }

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      const counters = entry.target.querySelectorAll("[data-count-to]");
      counters.forEach(animateCount);
      if (entry.target.hasAttribute("data-count-to")) {
        animateCount(entry.target);
      }
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.2 });

  revealElements.forEach(function (el) {
    el.classList.add("reveal-ready");
    observer.observe(el);
  });
}

function initWhenHeaderReady() {
  let attempts = 0;
  const timerId = window.setInterval(function () {
    attempts += 1;
    if (document.getElementById("header-local-weather")) {
      window.clearInterval(timerId);
      updateThemeButtonLabel(getThemeSelection());
      const themeBtn = document.getElementById("user-theme-btn");
      if (themeBtn) {
        themeBtn.addEventListener("click", function () {
          const current = getThemeSelection();
          const currentIndex = THEME_SELECTION_ORDER.indexOf(current);
          const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEME_SELECTION_ORDER.length : 0;
          const next = THEME_SELECTION_ORDER[nextIndex];
          setThemeSelection(next);
          updateThemeButtonLabel(next);
          applyThemeSelection(next);

          const label = next === "auto"
            ? "Theme: Auto • using live weather"
            : (THEME_PRESETS[next].label + " • selected manually");
          const icon = next === "auto" ? "fas fa-adjust" : THEME_PRESETS[next].icon;
          showTimedWeatherThemeNote(label, icon);
        });
      }
      loadHeaderLocalWeather();
      return;
    }
    if (attempts >= 40) {
      window.clearInterval(timerId);
      updateThemeButtonLabel(getThemeSelection());
      showTimedWeatherThemeNote("Default Theme • waiting for weather", "fas fa-cloud");
    }
  }, 250);
}

document.addEventListener("DOMContentLoaded", function () {
  initWhenHeaderReady();
  initScrollProgress();
  initRevealAnimations();
});
