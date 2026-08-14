import { useEffect, useState } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  ArcElement,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

import Sidebar from "../components/Sidebar";
import "../styles/statistics.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const COLORS = ["#3b82f6", "#ef4444", "#facc15", "#f97316"];

function Statistics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [summary, setSummary] = useState({
    totalCount: 0,
    warningCount: 0,
    ppeRate: 0,
    riskScore: 0,
  });

  const [hourlyWarnings, setHourlyWarnings] = useState([]);
  const [violationTypes, setViolationTypes] = useState([]);

  const loadStatistics = async () => {
    try {
      const params = new URLSearchParams();

      if (startDate) {
        params.append("start_date", startDate);
      }

      if (endDate) {
        params.append("end_date", endDate);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/statistics${query ? `?${query}` : ""}`
      );

      if (!response.ok) {
        throw new Error("통계 데이터 조회 실패");
      }

      const data = await response.json();

      setSummary(
        data.summary ?? {
          totalCount: 0,
          warningCount: 0,
          ppeRate: 0,
          riskScore: 0,
        }
      );

      setHourlyWarnings(data.hourlyWarnings ?? []);
      setViolationTypes(data.violationTypes ?? []);
    } catch (error) {
      console.error("통계 데이터 조회 실패:", error);

      setSummary({
        totalCount: 0,
        warningCount: 0,
        ppeRate: 0,
        riskScore: 0,
      });

      setHourlyWarnings([]);
      setViolationTypes([]);
    }
  };

  useEffect(() => {
    loadStatistics();
  }, []);

  const lineData = {
    labels: hourlyWarnings.map((item) => item.time),
    datasets: [
      {
        label: "위험 이벤트",
        data: hourlyWarnings.map((item) => item.count),
        borderColor: "#08a64b",
        backgroundColor: "rgba(8, 166, 75, 0.15)",
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: "#08a64b",
        pointBorderColor: "#08a64b",
        pointBorderWidth: 2,
        tension: 0.35,
        fill: true,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 2,
        },
      },
    },
  };

  const doughnutData = {
    labels: violationTypes.map((item) => item.type),
    datasets: [
      {
        data: violationTypes.map((item) => item.rate),
        backgroundColor: COLORS,
        borderWidth: 0,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "50%",
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main">
        <h1>통계 대시보드</h1>

        <section className="top-card">
          <div className="filter-box">
            <label>기간 선택</label>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <span>~</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <button type="button" onClick={loadStatistics}>
              검색
            </button>
          </div>

          <div className="summary-box">
            <div className="statistics-summary-card">
              <p>감지 작업자 수</p>
              <strong>
                {Number(summary.totalCount ?? 0).toLocaleString()} 건
              </strong>
            </div>

            <div className="statistics-summary-card">
              <p>위험 발생 건수</p>
              <strong>
                {Number(summary.warningCount ?? 0).toLocaleString()} 건
              </strong>
            </div>

            <div className="statistics-summary-card">
              <p>PPE 착용률</p>
              <strong>{summary.ppeRate ?? 0} %</strong>
            </div>

            <div className="statistics-summary-card">
              <p>평균 위험 점수</p>
              <strong>{summary.riskScore ?? 0} 점</strong>
            </div>
          </div>
        </section>

        <section className="chart-area">
          <div className="chart-card">
            <h2>시간대별 위험 이벤트</h2>

            <div className="chart-box">
              <Line data={lineData} options={lineOptions} />
            </div>
          </div>

          <div className="chart-card">
            <h2>위험 유형별 비율</h2>

            <div className="donut-wrap">
              <div className="donut-box">
                <Doughnut
                  data={doughnutData}
                  options={doughnutOptions}
                />
              </div>

              <ul id="typeLegend">
                {violationTypes.map((item, index) => (
                  <li key={`${item.type}-${index}`}>
                    <span
                      className="legend-color"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />

                    <span>
                      {item.type} ({item.rate}%)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Statistics;