
import { useState } from "react";
import {
  Activity,
  Bot,
  ChevronDown,
  Clock3,
  Leaf,
  LoaderCircle,
  MapPin,
  MessageCircle,
  RefreshCw,
  Send,
  Wind,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://airaware-ai.onrender.com";

const API_URL = `${API_BASE_URL}/api`;

const DEFAULT_LOCATION = "Bhopal, India";

const pollutantConfig = [
  { key: "pm2_5", label: "PM2.5", unit: "µg/m³" },
  { key: "pm10", label: "PM10", unit: "µg/m³" },
  { key: "no2", label: "NO₂", unit: "µg/m³" },
  { key: "o3", label: "O₃", unit: "µg/m³" },
  { key: "co", label: "CO", unit: "µg/m³" },
  { key: "so2", label: "SO₂", unit: "µg/m³" },
];

function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationInput, setLocationInput] =
    useState(DEFAULT_LOCATION);

  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm AirAware AI. Ask me about air quality, pollutants, or environmental awareness.",
    },
  ]);

  const [chatLoading, setChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const [history, setHistory] = useState([]);

  // ---------------------------------------------
  // NORMALIZE AIR QUALITY API RESPONSE
  // ---------------------------------------------

  function normalizeAirQuality(data) {
    const pollutants =
      data?.pollutants ||
      data?.data?.pollutants ||
      {};

    const locationData =
      data?.location ||
      data?.data?.location ||
      {};

    return {
      ...data,
      pollutants,
      location: locationData,
      openweather_aqi:
        data?.openweather_aqi ??
        data?.data?.openweather_aqi ??
        data?.aqi ??
        null,
    };
  }

  // ---------------------------------------------
  // FETCH AIR QUALITY
  // ---------------------------------------------

  async function fetchAirQuality(
    selectedLocation = location
  ) {
    if (!selectedLocation.trim()) {
      setError("Please enter a location.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/air-quality?location=${encodeURIComponent(
          selectedLocation
        )}`
      );

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.success === false) {
        throw new Error(
          data.error || "Unable to fetch air quality."
        );
      }

      const normalized = normalizeAirQuality(data);

      setAirQuality(normalized);
      setLocation(selectedLocation);

      // Store a simple history point for this session.
      const aqi =
        normalized.openweather_aqi;

      setHistory((previous) => [
        ...previous.slice(-6),
        {
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          aqi: typeof aqi === "number" ? aqi : null,
        },
      ]);
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the air quality server."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLocationSubmit(event) {
    event.preventDefault();
    fetchAirQuality(locationInput.trim());
  }

  // ---------------------------------------------
  // SEND MESSAGE TO AI SERVER
  // ---------------------------------------------

  async function sendMessage(event) {
    event?.preventDefault();

    const message = question.trim();

    if (!message || chatLoading) return;

    setMessages((previous) => [
      ...previous,
      { role: "user", text: message },
    ]);

    setQuestion("");
    setChatLoading(true);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          location: location,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Chat server error: ${response.status}`
        );
      }

      const data = await response.json();

      const answer =
        data.response ||
        data.answer ||
        data.message ||
        data.data?.response ||
        "I couldn't generate a response.";

      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text: answer,
        },
      ]);
    } catch (err) {
      setMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          text:
            err.message ||
            "Sorry, I couldn't connect to the AI server.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  // ---------------------------------------------
  // AQI DISPLAY
  // ---------------------------------------------

  const aqi = airQuality?.openweather_aqi;

  // OpenWeather AQI: 1–5.
  const aqiLabel =
    aqi === 1
      ? "Good"
      : aqi === 2
      ? "Fair"
      : aqi === 3
      ? "Moderate"
      : aqi === 4
      ? "Poor"
      : aqi === 5
      ? "Very Poor"
      : "Awaiting Data";

  const locationName =
    airQuality?.location?.name ||
    location;

  const lastUpdated =
    airQuality?.timestamp_unix
      ? new Date(
          airQuality.timestamp_unix * 1000
        ).toLocaleString()
      : "Not available";

  return (
    <div className="app-shell">

      {/* HEADER */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Leaf size={20} />
          </div>

          <div>
<header className="app-header">
  <h1>AirAware AI</h1>
</header>
            <p>Intelligent air quality insights</p>
          </div>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          Live
        </div>
      </header>

      <main className="dashboard">

        {/* LOCATION */}
        <section className="location-section">
          <div className="eyebrow">
            YOUR LOCATION
          </div>

          <form
            className="location-form"
            onSubmit={handleLocationSubmit}
          >
            <div className="location-input-wrap">
              <MapPin size={18} />
              <input
                value={locationInput}
                onChange={(event) =>
                  setLocationInput(event.target.value)
                }
                placeholder="Enter city..."
                aria-label="Air quality location"
              />
              <ChevronDown size={16} />
            </div>

            <button
              className="refresh-button"
              type="submit"
              disabled={loading}
              aria-label="Refresh air quality"
            >
              {loading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )}
            </button>
          </form>
        </section>

        {/* ERROR */}
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}

        {/* AQI HERO */}
        <section className="aqi-card">

          <div className="aqi-card-top">
            <div>
              <p className="card-label">
                AIR QUALITY INDEX
              </p>

              <div className="aqi-source">
                <Activity size={14} />
                OpenWeather AQI · Scale 1–5
              </div>
            </div>

            <div className="live-indicator">
              <span />
              LIVE DATA
            </div>
          </div>

          <div className="aqi-main">

            <div className="aqi-circle">
              <div className="aqi-circle-inner">
                <span className="aqi-number">
                  {aqi ?? "--"}
                </span>

                <span className="aqi-scale">
                  / 5
                </span>
              </div>
            </div>

            <div className="aqi-summary">
              <span className="summary-tag">
                CURRENT STATUS
              </span>

              <h2>{aqiLabel}</h2>

              <p>
                {aqi
                  ? "Current air quality reading for your selected location."
                  : "Search a location to view live air quality data."}
              </p>

              <div className="summary-location">
                <MapPin size={14} />
                {locationName}
              </div>
            </div>

          </div>

          <div className="aqi-footer">
            <div>
              <Clock3 size={14} />
              <span>{lastUpdated}</span>
            </div>

            <span className="source-text">
              Data source: OpenWeather
            </span>
          </div>

        </section>

        {/* POLLUTANTS */}
        <section className="section-block">

          <div className="section-heading">
            <div>
              <p className="eyebrow">AIR COMPOSITION</p>
              <h2>Pollutant levels</h2>
            </div>

            <Wind size={22} />
          </div>

          <div className="pollutant-grid">

            {pollutantConfig.map((pollutant) => {

              const value =
                airQuality?.pollutants?.[
                  pollutant.key
                ];

              return (
                <div
                  className="pollutant-card"
                  key={pollutant.key}
                >
                  <div className="pollutant-card-header">
                    <span>
                      {pollutant.label}
                    </span>

                    <div className="pollutant-icon">
                      <Wind size={15} />
                    </div>
                  </div>

                  <div className="pollutant-value">
                    {value ?? "--"}
                  </div>

                  <p className="pollutant-unit">
                    {pollutant.unit}
                  </p>

                  <div className="pollutant-bar">
                    <div
                      style={{
                        width:
                          typeof value === "number"
                            ? `${Math.min(
                                100,
                                Math.max(0, value / 5)
                              )}%`
                            : "0%",
                      }}
                    />
                  </div>

                  <p className="pollutant-status">
                    Measured concentration
                  </p>
                </div>
              );
            })}

          </div>

          <p className="data-note">
            Pollutant concentrations are displayed using the
            units provided by the data source. Levels are not
            independently classified into health categories.
          </p>

        </section>

        {/* TREND */}
        <section className="section-block">

          <div className="section-heading">
            <div>
              <p className="eyebrow">HISTORICAL ANALYTICS</p>
              <h2>Recent readings</h2>
            </div>

            <Activity size={22} />
          </div>

          <div className="chart-card">

            {history.filter((point) => point.aqi !== null).length > 1 ? (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart
                  data={history.filter(
                    (point) => point.aqi !== null
                  )}
                >
                  <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                  />

                  <YAxis
                    domain={[1, 5]}
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="aqi"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">
                <Activity size={30} />
                <p>
                  Refresh your location to collect
                  readings for this session.
                </p>
              </div>
            )}

          </div>

          <p className="data-note">
            This chart records readings collected during
            the current browser session. It is not a
            historical database or forecast.
          </p>

        </section>

        {/* AI ASSISTANT */}
        <section className="ai-banner">

          <div className="ai-banner-icon">
            <Bot size={24} />
          </div>

          <div className="ai-banner-content">
            <div className="ai-badge">
              <span />
              AI-POWERED
            </div>

            <h2>Understand your air</h2>

            <p>
              Ask AirAware AI to explain pollutants,
              interpret your readings, and learn about
              environmental awareness.
            </p>

            <button
              className="primary-button"
              onClick={() => setChatOpen(true)}
            >
              <MessageCircle size={17} />
              Ask AirAware AI
            </button>
          </div>

        </section>

      </main>

      {/* FLOATING CHAT BUTTON */}
      <button
        className="floating-chat"
        onClick={() => setChatOpen(true)}
        aria-label="Open AI assistant"
      >
        <MessageCircle size={22} />
      </button>

      {/* CHAT DRAWER */}
      {chatOpen && (
        <div className="chat-overlay">

          <div
            className="chat-panel"
            role="dialog"
            aria-modal="true"
            aria-label="AirAware AI Assistant"
          >

            <div className="chat-header">

              <div className="chat-title">
                <div className="chat-avatar">
                  <Bot size={20} />
                </div>

                <div>
                  <h2>AirAware AI</h2>
                  <p>Environmental assistant</p>
                </div>
              </div>

              <button
                className="icon-button"
                onClick={() => setChatOpen(false)}
                aria-label="Close assistant"
              >
                <X size={19} />
              </button>

            </div>

            <div className="chat-context">
              <MapPin size={14} />
              {location}
            </div>

            <div className="chat-messages">

              {messages.map((message, index) => (
                <div
                  className={`chat-message ${
                    message.role === "user"
                      ? "user-message"
                      : "assistant-message"
                  }`}
                  key={index}
                >
                  {message.text}
                </div>
              ))}

              {chatLoading && (
                <div className="assistant-message typing">
                  <LoaderCircle className="spin" size={16} />
                  Thinking...
                </div>
              )}

            </div>

            <form
              className="chat-input-area"
              onSubmit={sendMessage}
            >

              <input
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                placeholder="Ask about air quality..."
                aria-label="Ask AirAware AI"
              />

              <button
                type="submit"
                disabled={
                  chatLoading || !question.trim()
                }
                aria-label="Send message"
              >
                <Send size={18} />
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default App;