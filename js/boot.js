/* global Fluid, CONFIG */


<!-- External scripts -->
const scripts = [
  "https://code.jquery.com/jquery-3.6.0.min.js",
  "https://cdn.jsdelivr.net/npm/bootstrap@4/dist/js/bootstrap.bundle.min.js",
  "https://cdn.jsdelivr.net/npm/nprogress@0/nprogress.min.js",
  "https://cdn.jsdelivr.net/npm/typed.js@2/lib/typed.min.js",
  "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
];

scripts.forEach(src => {
  const script = document.createElement('script');
  script.src = src;
  script.async = false; // Ensures they load in order
  document.head.appendChild(script);
});

function getHeaderWeatherDescription(code) {
  const map = {
    0: "Clear",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy rain",
    71: "Snow",
    73: "Snow",
    75: "Heavy snow",
    80: "Showers",
    81: "Showers",
    82: "Heavy showers",
    95: "Thunderstorm"
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
    if (!locationResponse.ok) {
      throw new Error("Location lookup failed");
    }

    const location = await locationResponse.json();
    const lat = Number(location.latitude);
    const lon = Number(location.longitude);
    const city = location.city || location.region || location.country_name || "Your location";

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error("Coordinates unavailable");
    }

    const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude="
      + encodeURIComponent(lat)
      + "&longitude="
      + encodeURIComponent(lon)
      + "&current=temperature_2m,weather_code&timezone=auto";

    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error("Weather lookup failed");
    }

    const payload = await weatherResponse.json();
    const current = payload && payload.current ? payload.current : null;
    if (!current) {
      throw new Error("Weather data unavailable");
    }

    renderHeaderWeather(weatherEl, city, Number(current.weather_code), Number(current.temperature_2m));
  } catch (error) {
    setHeaderWeatherFallback(weatherEl);
  }
}

function initHeaderLocalWeather() {
  let attempts = 0;
  const maxAttempts = 40;
  const timerId = window.setInterval(function () {
    attempts += 1;
    if (document.getElementById("header-local-weather")) {
      window.clearInterval(timerId);
      loadHeaderLocalWeather();
      return;
    }
    if (attempts >= maxAttempts) {
      window.clearInterval(timerId);
    }
  }, 250);
}

document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('color-toggle-btn');

  if (toggleBtn) {
    toggleBtn.onclick = function() {
      const html = document.documentElement;
      const current = html.getAttribute('data-default-color-scheme');
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-default-color-scheme', next);

      // Optional: Save preference to local storage so it persists on refresh
      localStorage.setItem('theme', next);
    };
  }

  initHeaderLocalWeather();
});
