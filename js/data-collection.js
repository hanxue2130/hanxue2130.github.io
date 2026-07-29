 (function () {
  const weatherLocations = [
    { label: "Melbourne", country: "Australia", lat: -37.8409, lon: 144.9464, elementId: "weather-melbourne" },
    { label: "Sydney", country: "Australia", lat: -33.868, lon: 151.2093, elementId: "weather-sydney" },
    { label: "Shenzhen", country: "China", lat: 22.5428, lon: 114.0579, elementId: "weather-shenzhen" },
    { label: "Beijing", country: "China", lat: 39.9166, lon: 116.3833, elementId: "weather-beijing" }
  ];

  const state = { marsItems: [] };
  const statusEl = document.getElementById("api-status");
  const weatherListEl = document.getElementById("weather-list");
  const marsCardEl = document.getElementById("mars-card");
  const marsRefreshBtnEl = document.getElementById("mars-refresh-btn");

  async function fetchWeather(location) {
    const url = "https://api.open-meteo.com/v1/forecast?latitude="
      + encodeURIComponent(location.lat)
      + "&longitude="
      + encodeURIComponent(location.lon)
      + "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto";

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " while loading weather");
    }
    return response.json();
  }

  async function fetchMarsItems() {
    const response = await fetch("https://images-api.nasa.gov/search?q=mars&media_type=image&page=1");
    if (!response.ok) {
      throw new Error("HTTP " + response.status + " while loading Mars data");
    }

    const payload = await response.json();
    const items = (payload.collection && payload.collection.items) || [];
    return items.filter(function (item) {
      return Array.isArray(item.links) && item.links.length > 0 && item.links[0].href;
    });
  }

  function getWeatherDescription(code) {
    const map = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Moderate showers",
      82: "Violent showers",
      95: "Thunderstorm"
    };

    return map[code] || "Unspecified";
  }

  function getWeatherIconClass(code) {
    if (code === 0 || code === 1) return "fas fa-sun";
    if (code === 2 || code === 3) return "fas fa-cloud-sun";
    if (code === 45 || code === 48) return "fas fa-smog";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "fas fa-cloud-rain";
    if (code >= 71 && code <= 77) return "fas fa-snowflake";
    if (code >= 95) return "fas fa-bolt";
    return "fas fa-cloud";
  }

  function initWeatherCards() {
    if (!weatherListEl) {
      return;
    }

    weatherListEl.innerHTML = weatherLocations.map(function (location) {
      return "<div id=\"" + location.elementId + "\" class=\"weather-city-card weather-row\">"
        + "<div class=\"weather-head\"><i class=\"fas fa-cloud-sun\"></i><strong>"
        + location.label
        + "</strong><span class=\"weather-condition\">"
        + location.country
        + "</span></div>"
        + "<div class=\"weather-metrics\"><span class=\"weather-pill\">Loading...</span></div></div>";
    }).join("");
  }

  function renderWeatherLine(element, label, payload) {
    if (!element) {
      return;
    }

    if (!payload || !payload.current) {
      element.innerHTML = "<div class=\"weather-head\"><i class=\"fas fa-exclamation-circle\"></i><strong>"
        + label
        + "</strong></div><div class=\"weather-metrics\"><span class=\"weather-pill\">Unavailable</span></div>";
      return;
    }

    const current = payload.current;
    const temp = Number(current.temperature_2m);
    const humidity = Number(current.relative_humidity_2m);
    const wind = Number(current.wind_speed_10m);
    const code = Number(current.weather_code);

    const temperatureText = Number.isFinite(temp) ? temp.toFixed(1) + " deg C" : "-";
    const humidityText = Number.isFinite(humidity) ? humidity + "%" : "-";
    const windText = Number.isFinite(wind) ? wind.toFixed(1) + " km/h" : "-";

    element.innerHTML = "<div class=\"weather-head\"><i class=\"" + getWeatherIconClass(code) + "\"></i><strong>"
      + label
      + "</strong><span class=\"weather-condition\">"
      + getWeatherDescription(code)
      + "</span></div><div class=\"weather-metrics\">"
      + "<span class=\"weather-pill\">Temp " + temperatureText + "</span>"
      + "<span class=\"weather-pill\">Humidity " + humidityText + "</span>"
      + "<span class=\"weather-pill\">Wind " + windText + "</span>"
      + "</div>";
  }

  function renderMarsCard(item) {
    if (!marsCardEl) {
      return;
    }

    if (!item) {
      marsCardEl.innerHTML = "<p class=\"mb-0\">Mars snapshot unavailable.</p>";
      return;
    }

    const data = item.data && item.data[0] ? item.data[0] : {};
    const imageUrl = item.links && item.links[0] ? item.links[0].href : "";
    const title = data.title || "Mars Image";
    const dateCreated = data.date_created ? String(data.date_created).slice(0, 10) : "Unknown";
    const center = data.center || "NASA";

    marsCardEl.innerHTML = [
      imageUrl ? "<img class=\"mars-image mb-3\" src=\"" + imageUrl + "\" alt=\"Mars snapshot\">" : "",
      "<h6 class=\"mb-1\">" + title + "</h6>",
      "<p class=\"mb-1\"><strong>Date:</strong> " + dateCreated + "</p>",
      "<p class=\"mb-0\"><strong>Center:</strong> " + center + "</p>"
    ].join("");
  }

  function refreshMarsCard() {
    if (!state.marsItems.length) {
      renderMarsCard(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * state.marsItems.length);
    renderMarsCard(state.marsItems[randomIndex]);
  }

  async function init() {
    try {
      const weatherPromises = weatherLocations.map(function (location) {
        return fetchWeather(location);
      });
      const results = await Promise.allSettled(weatherPromises.concat(fetchMarsItems()));

      weatherLocations.forEach(function (location, index) {
        const result = results[index];
        const payload = result && result.status === "fulfilled" ? result.value : null;
        const element = document.getElementById(location.elementId);
        renderWeatherLine(element, location.label, payload);
      });

      const marsResult = results[weatherLocations.length];
      state.marsItems = marsResult.status === "fulfilled" ? marsResult.value : [];
      refreshMarsCard();

      const allWeatherOk = results.slice(0, weatherLocations.length).every(function (result) {
        return result.status === "fulfilled";
      });
      const marsOk = marsResult.status === "fulfilled";
      statusEl.className = allWeatherOk && marsOk ? "alert alert-success" : "alert alert-warning";
      statusEl.textContent = allWeatherOk && marsOk
        ? "Live data loaded successfully."
        : "Some data is temporarily unavailable.";
    } catch (error) {
      statusEl.className = "alert alert-danger";
      statusEl.textContent = "Unable to load data right now. " + error.message;
      weatherLocations.forEach(function (location) {
        renderWeatherLine(document.getElementById(location.elementId), location.label, null);
      });
      renderMarsCard(null);
    }
  }

  if (marsRefreshBtnEl) {
    marsRefreshBtnEl.addEventListener("click", refreshMarsCard);
  }

  initWeatherCards();
  init();
})();
