import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/dashboard.css";

const DASHBOARD_API = "/api/dashboard";

function getRiskLevelClass(riskLevel) {
  switch (riskLevel) {
    case "SAFE":
      return "level-safe";
    case "WARNING":
      return "level-warning";
    case "DANGER":
      return "level-danger";
    case "CRITICAL":
      return "level-critical";
    default:
      return "";
  }
}

function getStatusClass(status) {
  if (status === "확인" || status === "조치완료") {
    return "status-done";
  }

  return "status-pending";
}

function getStatusInfo(status) {
  switch (status) {
    case "WARNING":
      return { icon: "/img/warning.svg", color: "#f59e0b" };
    case "DANGER":
      return { icon: "/img/danger.svg", color: "#ff3333" };
    case "CRITICAL":
      return { icon: "/img/critical.svg", color: "#8b1515" };
    case "SAFE":
    default:
      return { icon: "/img/safe.svg", color: "#03a94d" };
  }
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await fetch(DASHBOARD_API);

        if (!response.ok) {
          throw new Error("대시보드 데이터 조회 실패");
        }

        const data = await response.json();
        setDashboard(data);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const status = dashboard?.overallStatus?.status ?? "-";
  const statusInfo = getStatusInfo(status);

  const warningChange =
    dashboard?.todayWarning?.change &&
    dashboard?.todayWarning?.changeText
      ? `${dashboard.todayWarning.change} ${dashboard.todayWarning.changeText}`
      : "-";

  const ppeRate =
    dashboard?.ppeRate?.rate !== undefined &&
    dashboard?.ppeRate?.rate !== null
      ? `${dashboard.ppeRate.rate}%`
      : "-";

  const ppeChange =
    dashboard?.ppeRate?.change &&
    dashboard?.ppeRate?.changeText
      ? `${dashboard.ppeRate.change} ${dashboard.ppeRate.changeText}`
      : "-";

  const connected = dashboard?.cctv?.connected;
  const total = dashboard?.cctv?.total;

  const cctvStatus =
    connected !== undefined && total !== undefined
      ? `${connected} / ${total}`
      : "-";

  const events = dashboard?.recentEvents ?? [];

  return (
    <div className="app-layout dashboard-page">
      <Sidebar />

      <main className="main dashboard-main">
        <h1>대시보드</h1>

        <section className="dashboard-summary">
          <div className="dashboard-summary-card safety-card">
            <p>현재 안전 상태</p>

            <div className="safety-status">
              <img
                className="safety-icon"
                src={statusInfo.icon}
                alt="안전 상태"
              />

              <div>
                <strong style={{ color: statusInfo.color }}>
                  {status}
                </strong>

                <span>
                  {dashboard?.overallStatus?.text ?? "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-summary-card">
            <p>오늘 전체 경고</p>
            <strong>{dashboard?.todayWarning?.count ?? "-"}</strong>
            <span>{warningChange}</span>
          </div>

          <div className="dashboard-summary-card">
            <p>PPE 착용률</p>
            <strong>{ppeRate}</strong>
            <span>{ppeChange}</span>
          </div>

          <div className="dashboard-summary-card">
            <p>CCTV 연결 상태</p>
            <strong>{cctvStatus}</strong>
            <span>{dashboard?.cctv?.text ?? "-"}</span>
          </div>
        </section>

        <section className="event-card">
          <h2>최근 이벤트</h2>

          <table className="event-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>CCTV</th>
                <th>위반 유형</th>
                <th>위험도</th>
                <th>처리 상태</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan="5">데이터를 불러오는 중입니다.</td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan="5">
                    대시보드 데이터를 불러오지 못했습니다.
                  </td>
                </tr>
              )}

              {!loading && !error && events.length === 0 && (
                <tr>
                  <td colSpan="5">최근 이벤트가 없습니다.</td>
                </tr>
              )}

              {!loading &&
                !error &&
                events.map((event, index) => (
                  <tr key={`${event.time}-${event.cctv}-${index}`}>
                    <td>{event.time ?? "-"}</td>
                    <td>{event.cctv ?? "-"}</td>
                    <td>{event.violation ?? "-"}</td>
                    <td className={getRiskLevelClass(event.riskLevel)}>
                      {event.riskLevel ?? "-"}
                    </td>
                    <td className={getStatusClass(event.status)}>
                      {event.status ?? "-"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;