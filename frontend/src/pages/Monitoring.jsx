import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/monitoring.css";

const API = {
  cctvList: "/api/cctv",
  monitoringStatus: "/api/monitoring/status",
  monitoringStatusAll: "/api/monitoring/status-all",
};

function getRiskClass(level) {
  switch (level) {
    case "SAFE":
      return "risk-safe";
    case "WARNING":
      return "risk-warning";
    case "DANGER":
      return "risk-danger";
    case "CRITICAL":
      return "risk-critical";
    default:
      return "";
  }
}

function getAlertInfo(level) {
  switch (level) {
    case "WARNING":
      return {
        icon: "/img/warning.svg",
        className: "risk-alert-warning",
        color: "#f59e0b",
      };

    case "DANGER":
      return {
        icon: "/img/danger.svg",
        className: "risk-alert-danger",
        color: "#ff3333",
      };

    case "CRITICAL":
      return {
        icon: "/img/critical.svg",
        className: "risk-alert-critical",
        color: "#8b1515",
      };

    default:
      return null;
  }
}

function Monitoring() {
  const [cctvList, setCctvList] = useState([]);
  const [selectedCctvId, setSelectedCctvId] = useState("");
  const [activeCctvId, setActiveCctvId] = useState("");

  const [monitoring, setMonitoring] = useState({
    riskLevel: "-",
    riskText: "-",
    riskScore: null,
    violations: {
      helmet: "-",
      vest: "-",
      zone: "-",
    },
  });

  const [fullscreenSrc, setFullscreenSrc] = useState("");

  const [alert, setAlert] = useState({
    show: false,
    level: "",
    message: "",
  });

  const pollingTimerRef = useRef(null);
  const alertTimerRef = useRef(null);
  const lastAlertMapRef = useRef({});

  const activeCctvList = cctvList
    .filter((cctv) => Number(cctv.is_active) === 1)
    .slice(0, 6);

  const resetMonitoring = () => {
    setMonitoring({
      riskLevel: "-",
      riskText: "-",
      riskScore: null,
      violations: {
        helmet: "-",
        vest: "-",
        zone: "-",
      },
    });
  };

  const showRiskAlert = (level, message) => {
    if (level === "SAFE") return;

    const info = getAlertInfo(level);

    if (!info) return;

    setAlert({
      show: true,
      level,
      message,
    });

    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }

    alertTimerRef.current = setTimeout(() => {
      setAlert((prev) => ({
        ...prev,
        show: false,
      }));

      alertTimerRef.current = null;
    }, 7000);
  };

  const processRiskAlert = (cctvId, data) => {
    const level = data?.riskLevel;

    if (!level || level === "-") {
      return;
    }

    if (level === "SAFE") {
      lastAlertMapRef.current[cctvId] = null;
      return;
    }

    const alertKey = [
      level,
      data.riskScore,
      data.violations?.helmet,
      data.violations?.vest,
      data.violations?.zone,
    ].join("-");

    if (lastAlertMapRef.current[cctvId] === alertKey) {
      return;
    }

    showRiskAlert(
      level,
      `${cctvId} ${data.riskText || "위험 상황이 감지되었습니다."}`
    );

    lastAlertMapRef.current[cctvId] = alertKey;
  };

  const loadAllMonitoringStatus = async () => {
    try {
      const response = await fetch(API.monitoringStatusAll);

      if (!response.ok) {
        throw new Error("전체 CCTV 상태 조회 실패");
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        return;
      }

      Object.entries(result.data).forEach(([cctvId, data]) => {
        processRiskAlert(cctvId, data);
      });
    } catch (error) {
      console.error("전체 CCTV 상태 조회 오류:", error);
    }
  };

  const loadMonitoringStatus = async (cctvId) => {
    if (!cctvId) {
      resetMonitoring();
      return;
    }

    try {
      const response = await fetch(
        `${API.monitoringStatus}?cctvId=${encodeURIComponent(cctvId)}`
      );

      if (!response.ok) {
        throw new Error("모니터링 상태 조회 실패");
      }

      const data = await response.json();

      setMonitoring({
        riskLevel: data.riskLevel ?? "-",
        riskText: data.riskText ?? "-",
        riskScore:
          data.riskScore !== undefined && data.riskScore !== null
            ? data.riskScore
            : null,
        violations: {
          helmet: data.violations?.helmet ?? "-",
          vest: data.violations?.vest ?? "-",
          zone: data.violations?.zone ?? "-",
        },
      });

      processRiskAlert(cctvId, data);
    } catch (error) {
      console.error(error);
      resetMonitoring();
    }
  };

  const clearPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const startAllPolling = () => {
    clearPolling();

    loadAllMonitoringStatus();

    pollingTimerRef.current = setInterval(() => {
      loadAllMonitoringStatus();
    }, 500);
  };

  const startSinglePolling = (cctvId) => {
    clearPolling();

    setTimeout(() => {
      loadMonitoringStatus(cctvId);
    }, 500);

    pollingTimerRef.current = setInterval(() => {
      loadMonitoringStatus(cctvId);
    }, 1000);
  };

  const handleSearch = () => {
    const cctvId = selectedCctvId;

    if (!cctvId) {
      setActiveCctvId("");
      resetMonitoring();
      startAllPolling();
      return;
    }

    setActiveCctvId(cctvId);
    startSinglePolling(cctvId);
  };

  useEffect(() => {
    const loadCctvList = async () => {
      try {
        const response = await fetch(API.cctvList);

        if (!response.ok) {
          throw new Error("CCTV 목록 조회 실패");
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || "CCTV 목록 조회 실패");
        }

        setCctvList(result.data ?? []);
        startAllPolling();
      } catch (error) {
        console.error(error);
      }
    };

    loadCctvList();

    return () => {
      clearPolling();

      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setFullscreenSrc("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const riskClass = getRiskClass(monitoring.riskLevel);
  const alertInfo = getAlertInfo(alert.level);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main">
        <h1>실시간 모니터링</h1>

        <section className="monitor-card">
          <div className="monitor-toolbar">
            <label htmlFor="cctvSelect">전체 CCTV</label>

            <select
              id="cctvSelect"
              value={selectedCctvId}
              onChange={(e) => setSelectedCctvId(e.target.value)}
            >
              <option value="">전체 CCTV</option>

              {cctvList.map((cctv) => (
                <option key={cctv.id} value={cctv.id}>
                  {cctv.name}
                </option>
              ))}
            </select>

            <button type="button" onClick={handleSearch}>
              검색
            </button>
          </div>

          <div className="video-box">
            {!activeCctvId ? (
              <div
                className={`video-grid grid-${activeCctvList.length}`}
              >
                {activeCctvList.map((cctv) => {
                  const videoSrc = `/api/video-feed/${cctv.id}`;

                  return (
                    <div className="video-item" key={cctv.id}>
                      <div className="video-title">
                        {cctv.name}
                      </div>

                      <img
                        src={videoSrc}
                        alt={`${cctv.name} 실시간 CCTV`}
                      />

                      <button
                        className="grid-fullscreen-btn"
                        type="button"
                        onClick={() => setFullscreenSrc(videoSrc)}
                      >
                        <img
                          src="/img/full-view.svg"
                          alt="전체보기"
                        />
                      </button>
                    </div>
                  );
                })}

                {activeCctvList.length === 0 && (
                  <div className="video-placeholder">
                    사용 가능한 CCTV가 없습니다.
                  </div>
                )}
              </div>
            ) : (
              <div id="singleVideoView">
                <img
                  className="cctv-video"
                  src={`/api/video-feed/${activeCctvId}`}
                  alt="실시간 CCTV"
                />

                <button
                  className="fullscreen-btn"
                  type="button"
                  title="전체보기"
                  onClick={() =>
                    setFullscreenSrc(
                      `/api/video-feed/${activeCctvId}`
                    )
                  }
                >
                  <img
                    src="/img/full-view.svg"
                    alt="전체보기"
                  />
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="status-area">
          <div className="risk-card">
            <div className="risk-left">
              <p>현재 위험도</p>

              <strong className={riskClass}>
                {monitoring.riskLevel}
              </strong>

              <span className={riskClass}>
                {monitoring.riskText}
              </span>
            </div>

            <div className="risk-divider"></div>

            <div className="risk-right">
              <p>위험도 점수</p>

              <strong>
                {monitoring.riskScore !== null
                  ? `${monitoring.riskScore} / 100`
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="violation-card">
            <h2>위반 현황</h2>

            <ul>
              <li>
                <span>안전모 미착용</span>
                <strong>{monitoring.violations.helmet}</strong>
              </li>

              <li>
                <span>안전조끼 미착용</span>
                <strong>{monitoring.violations.vest}</strong>
              </li>

              <li>
                <span>위험구역 진입</span>
                <strong>{monitoring.violations.zone}</strong>
              </li>
            </ul>
          </div>
        </section>
      </main>

      {alertInfo && (
        <div
          className={`risk-alert-toast ${
            alert.show ? "show" : ""
          } ${alertInfo.className}`}
        >
          <img src={alertInfo.icon} alt="위험 알림" />

          <div>
            <strong style={{ color: alertInfo.color }}>
              {alert.level}
            </strong>

            <p>{alert.message}</p>
          </div>
        </div>
      )}

      <div
        className={`fullscreen-modal ${
          fullscreenSrc ? "active" : ""
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setFullscreenSrc("");
          }
        }}
      >
        <div className="fullscreen-content">
          <button
            type="button"
            className="close-fullscreen-btn"
            onClick={() => setFullscreenSrc("")}
          >
            ×
          </button>

          {fullscreenSrc && (
            <img
              src={fullscreenSrc}
              className="fullscreen-video"
              alt="전체 CCTV 영상"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Monitoring;