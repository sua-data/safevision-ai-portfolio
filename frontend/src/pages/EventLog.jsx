import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/event-log.css";

function getRiskClass(risk) {
  if (risk === "WARNING") return "risk-warning";
  if (risk === "DANGER") return "risk-danger";
  if (risk === "CRITICAL") return "risk-critical";
  return "";
}

function getStatusClass(status) {
  if (status === "미확인") return "status-unchecked";
  if (status === "확인") return "status-confirmed";
  if (status === "조치완료") return "status-completed";
  return "";
}

function getImageUrl(event) {
  return (
    event?.imageUrl ||
    event?.captureImage ||
    event?.capturePath ||
    event?.capture_url ||
    event?.image_url ||
    ""
  );
}

function EventLog() {
  const [events, setEvents] = useState([]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cctvId, setCctvId] = useState("all");

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [status, setStatus] = useState("미확인");
  const [memo, setMemo] = useState("");

  const [fullscreenImage, setFullscreenImage] = useState("");

  const loadEvents = async () => {
    try {
      const params = new URLSearchParams();

      if (startDate) {
        params.append("start_date", startDate);
      }

      if (endDate) {
        params.append("end_date", endDate);
      }

      if (cctvId && cctvId !== "all") {
        params.append("cctv_id", cctvId);
      }

      const query = params.toString();

      const response = await fetch(
        `/api/events${query ? `?${query}` : ""}`
      );

      if (!response.ok) {
        throw new Error("이벤트 목록 조회 실패");
      }

      const result = await response.json();

      setEvents(result.data ?? []);
    } catch (error) {
      console.error("이벤트 목록 조회 오류:", error);
      setEvents([]);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (fullscreenImage) {
          setFullscreenImage("");
        } else if (selectedEvent) {
          setSelectedEvent(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreenImage, selectedEvent]);

  const openDetail = (event) => {
    setSelectedEvent(event);
    setStatus(event.status ?? "미확인");
    setMemo(event.memo ?? "");
  };

  const closeDetail = () => {
    setSelectedEvent(null);
    setStatus("미확인");
    setMemo("");
  };

  const handleSave = async () => {
    if (!selectedEvent) {
      return;
    }

    try {
      const response = await fetch(
        `/api/events/${selectedEvent.id}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            comment: memo,
          }),
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "처리 상태 저장에 실패했습니다.");
        return;
      }

      setEvents((prev) =>
        prev.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                status,
                memo,
              }
            : event
        )
      );

      closeDetail();
      alert("저장되었습니다.");
    } catch (error) {
      console.error("이벤트 처리 상태 저장 오류:", error);
      alert("서버 오류로 처리 상태를 저장하지 못했습니다.");
    }
  };

  const imageUrl = getImageUrl(selectedEvent);

  return (
    <div className="app-layout event-log-page">
      <Sidebar />

      <main className="main">
        <h1>이벤트 로그</h1>

        <section className="card">
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

            <label>CCTV 선택</label>

            <select
              value={cctvId}
              onChange={(e) => setCctvId(e.target.value)}
            >
              <option value="all">전체 CCTV</option>
              <option value="cctv01">1번 CCTV</option>
              <option value="cctv02">2번 CCTV</option>
              <option value="cctv03">3번 CCTV</option>
            </select>

            <button type="button" onClick={loadEvents}>
              검색
            </button>
          </div>

          <table>
            <thead>
              <tr>
                <th>번호</th>
                <th>시간</th>
                <th>CCTV</th>
                <th>위반 유형</th>
                <th>위험도</th>
                <th>처리 상태</th>
                <th>상세보기</th>
              </tr>
            </thead>

            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    조회된 이벤트가 없습니다.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>{event.id}</td>
                    <td>{event.time}</td>
                    <td>{event.cctv}</td>
                    <td>{event.type}</td>

                    <td className={getRiskClass(event.risk)}>
                      {event.risk}
                    </td>

                    <td className={getStatusClass(event.status)}>
                      {event.status}
                    </td>

                    <td>
                      <button
                        className="detail-btn"
                        type="button"
                        onClick={() => openDetail(event)}
                      >
                        상세
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      <div className={`event-log-modal ${selectedEvent ? "show" : ""}`}>
        {selectedEvent && (
          <div className="modal-card">
            <h2>이벤트 상세</h2>

            <div className="capture-box">
              {!imageUrl ? (
                <div className="capture-placeholder">
                  캡처 이미지
                </div>
              ) : (
                <>
                  <img
                    src={imageUrl}
                    className="capture-image"
                    alt="이벤트 캡처 이미지"
                  />

                  <button
                    type="button"
                    className="image-fullscreen-btn"
                    title="전체보기"
                    onClick={() => setFullscreenImage(imageUrl)}
                  >
                    <img
                      src="/img/full-view.svg"
                      alt="전체보기"
                    />
                  </button>
                </>
              )}
            </div>

            <div className="detail-content">
              <div className="detail-left">
                <h3>이벤트 정보</h3>

                <div className="info-row">
                  <span>발생 시간</span>
                  <strong>{selectedEvent.time}</strong>
                </div>

                <div className="info-row">
                  <span>CCTV</span>
                  <strong>{selectedEvent.cctv}</strong>
                </div>

                <div className="info-row">
                  <span>위반 유형</span>
                  <strong>{selectedEvent.type}</strong>
                </div>

                <div className="info-row">
                  <span>위험도</span>
                  <strong
                    className={getRiskClass(selectedEvent.risk)}
                  >
                    {selectedEvent.risk} ({selectedEvent.score}점)
                  </strong>
                </div>
              </div>

              <div className="detail-right">
                <div className="form-row">
                  <label>처리 상태</label>

                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option>미확인</option>
                    <option>확인</option>
                    <option>조치완료</option>
                  </select>
                </div>

                <div className="form-row">
                  <label>메모</label>

                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="메모를 입력하세요"
                  />
                </div>
              </div>
            </div>

            <div className="modal-buttons">
              <button
                id="saveBtn"
                type="button"
                onClick={handleSave}
              >
                저장
              </button>

              <button
                id="closeBtn"
                type="button"
                onClick={closeDetail}
              >
                목록으로
              </button>
            </div>
          </div>
        )}
      </div>

      <div
        className={`image-fullscreen-modal ${
          fullscreenImage ? "active" : ""
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            setFullscreenImage("");
          }
        }}
      >
        {fullscreenImage && (
          <div className="image-fullscreen-content">
            <button
              type="button"
              className="close-image-fullscreen-btn"
              onClick={() => setFullscreenImage("")}
            >
              ×
            </button>

            <img
              src={fullscreenImage}
              className="fullscreen-capture-image"
              alt="이벤트 캡처 확대 이미지"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default EventLog;