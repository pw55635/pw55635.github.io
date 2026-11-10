const APIkey = "29082c96808bff194490606bdc40691f";

const weatherForm = document.getElementById("weather-form");
const cityInput = document.getElementById("city-search");
const statusMessage = document.getElementById("status-message");
const currentWeather = document.getElementById("current-weather");
const forecastSection = document.getElementById("forecast-section");
const forecastList = document.getElementById("forecast-list");

const cityName = document.getElementById("city-name");
const temperature = document.getElementById("temperature");
const condition = document.getElementById("condition");
const feelsLike = document.getElementById("feels-like");
const humidity = document.getElementById("humidity");
const wind = document.getElementById("wind");
const weatherIcon = document.getElementById("weather-icon");

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.style.color = isError ? "#b33434" : "#5b6985";
}

function toWeatherIcon(code) {
  const icons = {
    "01d": "☀️",
    "01n": "🌙",
    "02d": "⛅",
    "02n": "⛅",
    "03d": "☁️",
    "03n": "☁️",
    "04d": "☁️",
    "04n": "☁️",
    "09d": "🌦️",
    "09n": "🌧️",
    "10d": "🌦️",
    "10n": "🌧️",
    "11d": "⛈️",
    "11n": "⛈️",
    "13d": "❄️",
    "13n": "❄️",
    "50d": "🌫️",
    "50n": "🌫️"
  };

  return icons[code] || "🌤️";
}

function renderCurrentWeather(data) {
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  condition.textContent = data.weather[0].description;
  feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
  humidity.textContent = `${data.main.humidity}%`;
  wind.textContent = `${Math.round(data.wind.speed)} m/s`;
  weatherIcon.textContent = toWeatherIcon(data.weather[0].icon);
  currentWeather.classList.remove("hidden");
}

function renderForecast(data) {
  const cityTimezoneOffset = data.city.timezone;
  const days = new Map();

  data.list.forEach((item) => {
    const cityDate = new Date((item.dt + cityTimezoneOffset) * 1000);
    const dateKey = `${cityDate.getUTCFullYear()}-${cityDate.getUTCMonth()}-${cityDate.getUTCDate()}`;
    const dayLabel = new Intl.DateTimeFormat("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC"
    }).format(cityDate);
    const time = new Intl.DateTimeFormat("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC"
    }).format(cityDate);

    if (!days.has(dateKey)) {
      days.set(dateKey, { label: dayLabel, forecasts: [] });
    }

    days.get(dateKey).forecasts.push(`
        <article class="forecast-item">
          <div class="time">${time}</div>
          <div class="icon">${toWeatherIcon(item.weather[0].icon)}</div>
          <strong>${Math.round(item.main.temp)}°C</strong>
          <div class="desc">${item.weather[0].description}</div>
        </article>
      `);
  });

  forecastList.innerHTML = [...days.values()]
    .map(({ label, forecasts }) => `
      <section class="forecast-day">
        <h3>${label}</h3>
        <div class="forecast-day-list">${forecasts.join("")}</div>
      </section>
    `)
    .join("");

  forecastSection.classList.remove("hidden");
}

function handleError(message) {
  setStatus(message, true);
  currentWeather.classList.add("hidden");
  forecastSection.classList.add("hidden");
}

function fetchWeather(city) {
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${APIkey}&units=metric&lang=pl`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${APIkey}&units=metric&lang=pl`;

  setStatus("Pobieram dane o pogodzie...");

  const xhr = new XMLHttpRequest();
  xhr.open("GET", currentUrl, true);
  xhr.onload = function () {
    const currentData = JSON.parse(xhr.responseText || "{}");
    console.log("Current weather API response:", currentData);

    if (xhr.status === 200) {
      renderCurrentWeather(currentData);
    } else {
      handleError(currentData.message ? `Błąd: ${currentData.message}` : "Nie można pobrać pogody dla tego miasta.");
      return;
    }
  };
  xhr.onerror = function () {
    handleError("Wystąpił błąd połączenia z API.");
  };
  xhr.send();

  fetch(forecastUrl)
    .then(async (response) => {
      const forecastData = await response.json();
      console.log("Forecast API response:", forecastData);
      if (!response.ok) {
        throw new Error(forecastData.message || "Nie można pobrać prognozy.");
      }
      return forecastData;
    })
    .then((forecastData) => {
      renderForecast(forecastData);
      setStatus(`Pogoda dla miasta: ${city}`);
    })
    .catch((error) => {
      handleError(error.message || "Nie można pobrać prognozy.");
    });
}

weatherForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();
  if (!city) {
    setStatus("Wprowadź nazwę miasta.", true);
    return;
  }

  fetchWeather(city);
});
