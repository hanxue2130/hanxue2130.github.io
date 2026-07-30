(function () {
  "use strict";

  var cities = [];

  // ─────────────────────────────────────────────
  //  State
  // ─────────────────────────────────────────────
  var state = {
    selectedIdx: 0,
    marsItems:   [],
    weatherCache: {},
    chart:       null
  };

  function showStatus(message) {
    if (!statusEl) return;
    statusEl.className = "alert alert-warning";
    statusEl.textContent = message;
    statusEl.style.display = "";
  }

  function hideStatus() {
    if (!statusEl) return;
    statusEl.style.display = "none";
    statusEl.textContent = "";
  }

  function fetchCityData() {
    return fetch("/data-collection/cities.json").then(function (r) {
      if (!r.ok) throw new Error("City dataset request failed");
      return r.json();
    }).then(function (payload) {
      if (!payload || !Array.isArray(payload.cities)) {
        throw new Error("City dataset format is invalid");
      }
      return payload.cities;
    });
  }

  // ─────────────────────────────────────────────
  //  DOM
  // ─────────────────────────────────────────────
  var statusEl      = document.getElementById("api-status");
  var selectEl      = document.getElementById("city-select");
  var panelEl       = document.getElementById("city-detail-panel");
  var chartCardEl   = document.getElementById("city-chart-card");
  var chartTitleEl  = document.getElementById("chart-title");
  var marsCardEl    = document.getElementById("mars-card");
  var marsRefreshEl = document.getElementById("mars-refresh-btn");

  // ─────────────────────────────────────────────
  //  Weather helpers
  // ─────────────────────────────────────────────
  var weatherMap = {
    0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Foggy",48:"Rime fog",
    51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",
    61:"Light rain",63:"Rain",65:"Heavy rain",
    71:"Light snow",73:"Snow",75:"Heavy snow",
    80:"Showers",81:"Heavy showers",82:"Violent showers",
    95:"Thunderstorm"
  };
  function wDesc(c) { return weatherMap[c] || "Conditions unknown"; }
  function wIcon(c) {
    if (c <= 1)  return "fas fa-sun";
    if (c <= 3)  return "fas fa-cloud-sun";
    if (c <= 48) return "fas fa-smog";
    if (c >= 71 && c <= 77) return "fas fa-snowflake";
    if (c >= 95) return "fas fa-bolt";
    return "fas fa-cloud-rain";
  }

  // ─────────────────────────────────────────────
  //  Fetch weather (only live API needed)
  // ─────────────────────────────────────────────
  function fetchWeather(city) {
    return fetch(
      "https://api.open-meteo.com/v1/forecast"
      + "?latitude="  + city.lat
      + "&longitude=" + city.lon
      + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,"
      + "wind_speed_10m,precipitation,weather_code&timezone=auto"
    ).then(function(r){ if(!r.ok) throw r; return r.json(); });
  }

  function fetchMars() {
    return fetch("https://images-api.nasa.gov/search?q=mars&media_type=image&page=1")
      .then(function(r){ if(!r.ok) throw r; return r.json(); })
      .then(function(p){
        var items = (p.collection && p.collection.items) || [];
        return items.filter(function(i){ return i.links && i.links[0] && i.links[0].href; });
      });
  }

  // ─────────────────────────────────────────────
  //  Score colour
  // ─────────────────────────────────────────────
  function sColor(s) {
    return s >= 7 ? "#27ae60" : s >= 5 ? "#f39c12" : "#e74c3c";
  }

  // ─────────────────────────────────────────────
  //  Render panel
  // ─────────────────────────────────────────────
  function renderPanel(city, weather) {
    // ── Weather strip ──
    var weatherHtml = "";
    if (weather && weather.current) {
      var c    = weather.current;
      var temp = Number(c.temperature_2m);
      var feel = Number(c.apparent_temperature);
      var hum  = Number(c.relative_humidity_2m);
      var wind = Number(c.wind_speed_10m);
      var prec = Number(c.precipitation);
      var code = Number(c.weather_code);

      weatherHtml =
        "<div class='city-weather-strip'>"
        + "<div class='cws-icon'><i class='" + wIcon(code) + "'></i></div>"
        + "<div class='cws-main'>"
        +   "<span class='cws-temp'>" + (Number.isFinite(temp) ? temp.toFixed(1) : "—") + "°C</span>"
        +   "<span class='cws-desc'>" + wDesc(code) + "</span>"
        + "</div>"
        + "<div class='cws-pills'>"
        +   "<span class='weather-pill'><i class='fas fa-thermometer-half'></i> Feels " + (Number.isFinite(feel) ? feel.toFixed(1)+"°C" : "—") + "</span>"
        +   "<span class='weather-pill'><i class='fas fa-tint'></i> " + (Number.isFinite(hum) ? hum+"%" : "—") + "</span>"
        +   "<span class='weather-pill'><i class='fas fa-wind'></i> " + (Number.isFinite(wind) ? wind.toFixed(1)+" km/h" : "—") + "</span>"
        +   (Number.isFinite(prec) && prec > 0 ? "<span class='weather-pill'><i class='fas fa-umbrella'></i> "+prec.toFixed(1)+" mm</span>" : "")
        + "</div>"
        + "</div>";
    } else {
      weatherHtml = "<p class='text-muted small'>Weather data unavailable.</p>";
    }

    // ── Overall badge ──
    var overallBadge =
      "<div class='city-overall-badge'>"
      + "<span class='cob-label'>Overall City Score</span>"
      + "<span class='cob-value'>" + city.overall.toFixed(1) + "<span class='cob-unit'>/100</span></span>"
      + "</div>";

    // ── QoL bars ──
    var barsHtml = "<div class='qol-grid'>";
    city.scores.forEach(function(s) {
      var col = sColor(s.score);
      barsHtml +=
        "<div class='qol-row'>"
        + "<span class='qol-label'>" + s.name + "</span>"
        + "<div class='qol-bar-wrap'><div class='qol-bar' style='width:" + Math.round(s.score * 10) + "%;background:" + col + ";'></div></div>"
        + "<span class='qol-score' style='color:" + col + ";'>" + s.score.toFixed(1) + "</span>"
        + "</div>";
    });
    barsHtml += "</div>";

    // ── Highlights grid ──
    var factsHtml = "<div class='city-facts-grid'>";
    city.highlights.forEach(function(h) {
      factsHtml +=
        "<div class='city-fact-card'>"
        + "<span class='cfc-label'>" + h.label + "</span>"
        + "<span class='cfc-value'>" + h.value + "</span>"
        + "</div>";
    });
    factsHtml += "</div>";

    // ── Assemble ──
    panelEl.innerHTML =
      "<div class='city-panel-header'>"
      + "<div>"
      +   "<h3 class='cph-name'>" + city.label + "</h3>"
      +   "<span class='cph-country'>" + city.country + "</span>"
      + "</div>"
      + "</div>"

      + "<div class='row'>"
      +   "<div class='col-lg-6 mb-3'>"
      +     "<div class='card data-card h-100'><div class='card-body'>"
      +       "<h6 class='section-label'>Weather</h6>"
      +       weatherHtml
      +     "</div></div>"
      +   "</div>"
      +   "<div class='col-lg-6 mb-3'>"
      +     "<div class='card data-card h-100'><div class='card-body'>"
      +       "<h6 class='section-label'>Quality of Life</h6>"
      +       overallBadge
      +       barsHtml
      +     "</div></div>"
      +   "</div>"
      +   "<div class='col-12 mb-3'>"
      +     "<div class='card data-card'><div class='card-body py-3'>"
      +       "<h6 class='section-label mb-2'>City Highlights</h6>"
      +       factsHtml
      +     "</div></div>"
      +   "</div>"
      + "</div>";
  }

  // ─────────────────────────────────────────────
  //  Render chart
  // ─────────────────────────────────────────────
  function renderChart(city) {
    if (!chartCardEl) return;
    if (state.chart) { state.chart.destroy(); state.chart = null; }

    chartCardEl.style.display = "";
    if (chartTitleEl) chartTitleEl.textContent = city.label + " — Quality of Life";

    var cats   = city.scores.map(function(s){ return s.name; });
    var vals   = city.scores.map(function(s){ return s.score; });
    var colors = vals.map(function(v){ return sColor(v); });

    var ctx = document.getElementById("city-chart");
    if (!ctx) return;

    state.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: cats,
        datasets: [{
          label: "Score / 10",
          data: vals,
          backgroundColor: colors.map(function(c){ return c + "cc"; }),
          borderColor: colors,
          borderWidth: 1,
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx){ return " " + Number(ctx.raw).toFixed(1) + " / 10"; }
            }
          }
        },
        scales: {
          x: { min: 0, max: 10, grid: { color: "rgba(0,0,0,0.05)" } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  //  Load city
  // ─────────────────────────────────────────────
  function loadCity(idx) {
    state.selectedIdx = idx;
    var city = cities[idx];

    // Show spinner
    panelEl.innerHTML =
      "<div class='text-center py-4 text-muted'>"
      + "<i class='fas fa-spinner fa-spin mr-2'></i>Loading " + city.label + "…</div>";
    if (chartCardEl) chartCardEl.style.display = "none";

    hideStatus();

    // Render static data immediately, fetch live weather
    var cached = state.weatherCache[city.label];
    if (cached !== undefined) {
      renderPanel(city, cached);
      renderChart(city);
      return;
    }

    fetchWeather(city).then(function(w) {
      state.weatherCache[city.label] = w;
      if (state.selectedIdx !== idx) return;
      renderPanel(city, w);
      renderChart(city);
    }).catch(function() {
      state.weatherCache[city.label] = null;
      if (state.selectedIdx !== idx) return;
      renderPanel(city, null);
      renderChart(city);
      showStatus("Live weather is temporarily unavailable for " + city.label + ".");
    });
  }

  // ─────────────────────────────────────────────
  //  Mars card
  // ─────────────────────────────────────────────
  function renderMars(item) {
    if (!marsCardEl) return;
    if (!item) { marsCardEl.innerHTML = "<p class='text-muted small mb-0'>Unavailable.</p>"; return; }
    var d   = item.data && item.data[0] ? item.data[0] : {};
    var img = item.links && item.links[0] ? item.links[0].href : "";
    var date = d.date_created ? String(d.date_created).slice(0,10) : "Unknown";
    marsCardEl.innerHTML =
      (img ? "<img class='mars-image mb-3' src='" + img + "' alt='Mars'>" : "")
      + "<h6 class='mb-1'>" + (d.title || "Mars Image") + "</h6>"
      + "<p class='mb-0 text-muted small'>" + date + (d.center ? " &middot; " + d.center : "") + "</p>";
  }

  function refreshMars() {
    if (!state.marsItems.length) { renderMars(null); return; }
    renderMars(state.marsItems[Math.floor(Math.random() * state.marsItems.length)]);
  }

  // ─────────────────────────────────────────────
  //  Init
  // ─────────────────────────────────────────────
  function init() {
    hideStatus();

    if (marsRefreshEl) marsRefreshEl.addEventListener("click", refreshMars);

    fetchMars()
      .then(function(items){ state.marsItems = items; refreshMars(); })
      .catch(function(){ renderMars(null); });

    fetchCityData().then(function (loadedCities) {
      cities = loadedCities;

      if (!selectEl) {
        throw new Error("City dropdown is missing from the page");
      }

      selectEl.innerHTML = "";
      cities.forEach(function (city, i) {
        var opt = document.createElement("option");
        opt.value = i;
        opt.textContent = city.label;
        if (i === 0) opt.selected = true;
        selectEl.appendChild(opt);
      });

      selectEl.addEventListener("change", function() {
        loadCity(parseInt(selectEl.value, 10));
      });

      loadCity(0); // Sydney default
    }).catch(function (error) {
      panelEl.innerHTML = "<div class='text-muted py-3'>City data is unavailable right now.</div>";
      showStatus("Unable to load city data.");
    });
  }

  init();
})();
