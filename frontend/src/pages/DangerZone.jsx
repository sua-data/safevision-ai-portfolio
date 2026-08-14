import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "../styles/danger-zone.css";

const EMPTY_ZONE = {
  x1: null,
  y1: null,
  x2: null,
  y2: null,
};

function DangerZone() {
  const canvasRef = useRef(null);

  const [cctvList, setCctvList] = useState([]);
  const [selectedCctv, setSelectedCctv] = useState("");
  const [activeCctv, setActiveCctv] = useState("");

  const [zoneName, setZoneName] = useState("");
  const [zone, setZone] = useState(EMPTY_ZONE);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);

  const startPointRef = useRef({ x: 0, y: 0 });

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(value, max));

  const normalizeZone = (target) => {
    if (
      target.x1 === null ||
      target.y1 === null ||
      target.x2 === null ||
      target.y2 === null
    ) {
      return target;
    }

    return {
      x1: Math.min(target.x1, target.x2),
      y1: Math.min(target.y1, target.y2),
      x2: Math.max(target.x1, target.x2),
      y2: Math.max(target.y1, target.y2),
    };
  };

  const getMousePosition = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    return {
      x: Math.round(event.clientX - rect.left),
      y: Math.round(event.clientY - rect.top),
    };
  };

  const handleMouseDown = (event) => {
    if (event.target.closest(".zone-handle")) {
      return;
    }

    const canvas = canvasRef.current;
    const pos = getMousePosition(event);

    const x = clamp(pos.x, 0, canvas.clientWidth);
    const y = clamp(pos.y, 0, canvas.clientHeight);

    startPointRef.current = { x, y };

    setZone({
      x1: x,
      y1: y,
      x2: x,
      y2: y,
    });

    setIsDrawing(true);
  };

  const handleMouseMove = (event) => {
    if (!isDrawing && !isResizing) {
      return;
    }

    const canvas = canvasRef.current;
    const pos = getMousePosition(event);

    const x = clamp(pos.x, 0, canvas.clientWidth);
    const y = clamp(pos.y, 0, canvas.clientHeight);

    if (isDrawing) {
      setZone((prev) =>
        normalizeZone({
          ...prev,
          x2: x,
          y2: y,
        })
      );

      return;
    }

    if (isResizing) {
      setZone((prev) => {
        const next = { ...prev };

        if (activeHandle === "tl") {
          next.x1 = x;
          next.y1 = y;
        }

        if (activeHandle === "tr") {
          next.x2 = x;
          next.y1 = y;
        }

        if (activeHandle === "bl") {
          next.x1 = x;
          next.y2 = y;
        }

        if (activeHandle === "br") {
          next.x2 = x;
          next.y2 = y;
        }

        return normalizeZone(next);
      });
    }
  };

  const stopAction = () => {
    setIsDrawing(false);
    setIsResizing(false);
    setActiveHandle(null);
  };

  useEffect(() => {
    window.addEventListener("mouseup", stopAction);

    return () => {
      window.removeEventListener("mouseup", stopAction);
    };
  }, []);

  useEffect(() => {
    const loadCctvOptions = async () => {
      try {
        const response = await fetch("/api/cctv");

        if (!response.ok) {
          throw new Error("CCTV 목록 조회 실패");
        }

        const result = await response.json();

        if (!result.success) {
          return;
        }

        setCctvList(result.data ?? []);
      } catch (error) {
        console.error("CCTV 목록 조회 실패:", error);
      }
    };

    loadCctvOptions();
  }, []);

  const handleSearch = () => {
    if (!selectedCctv) {
      alert("CCTV를 선택하세요.");
      return;
    }

    setActiveCctv(selectedCctv);
    setZone(EMPTY_ZONE);
  };

  const handleReset = () => {
    setZone(EMPTY_ZONE);
  };

  const handleCoordChange = (key, value) => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const numericValue =
      value === "" ? null : Number(value);

    if (
      numericValue !== null &&
      Number.isNaN(numericValue)
    ) {
      return;
    }

    setZone((prev) => ({
      ...prev,
      [key]:
        numericValue === null
          ? null
          : clamp(
              numericValue,
              0,
              key.startsWith("x")
                ? canvas.clientWidth
                : canvas.clientHeight
            ),
    }));
  };

  const handleSave = async () => {
    if (
      zone.x1 === null ||
      zone.y1 === null ||
      zone.x2 === null ||
      zone.y2 === null
    ) {
      alert("위험구역을 먼저 설정하세요.");
      return;
    }

    if (!selectedCctv) {
      alert("CCTV를 선택하세요.");
      return;
    }

    const canvas = canvasRef.current;

    const BASE_WIDTH = 1280;
    const BASE_HEIGHT = 720;

    const scaleX = BASE_WIDTH / canvas.clientWidth;
    const scaleY = BASE_HEIGHT / canvas.clientHeight;

    const normalized = normalizeZone(zone);

    const payload = {
      cctv_id: selectedCctv,
      zone_name: zoneName.trim() || "위험구역 1",
      x1: Math.round(normalized.x1 * scaleX),
      y1: Math.round(normalized.y1 * scaleY),
      x2: Math.round(normalized.x2 * scaleX),
      y2: Math.round(normalized.y2 * scaleY),
    };

    try {
      const response = await fetch("/api/danger-zone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        alert("위험구역이 저장되었습니다.");
      } else {
        alert(result.message || "저장 실패");
      }
    } catch (error) {
      console.error("위험구역 저장 오류:", error);
      alert("서버 오류가 발생했습니다.");
    }
  };

  const hasZone =
    zone.x1 !== null &&
    zone.y1 !== null &&
    zone.x2 !== null &&
    zone.y2 !== null;

  const normalizedZone = hasZone
    ? normalizeZone(zone)
    : null;

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main">
        <h1>위험구역 설정</h1>

        <div className="zone-tabs">
          <NavLink
            to="/danger-zone"
            className="zone-tab active"
          >
            지정
          </NavLink>

          <NavLink
            to="/danger-zone-manage"
            className="zone-tab"
          >
            관리
          </NavLink>
        </div>

        <section className="zone-card">
          <div className="zone-toolbar">
            <label htmlFor="cctvSelect">
              CCTV 선택
            </label>

            <select
              id="cctvSelect"
              value={selectedCctv}
              onChange={(e) =>
                setSelectedCctv(e.target.value)
              }
            >
              <option value="">
                CCTV 선택
              </option>

              {cctvList.map((cctv, index) => (
                <option
                  key={cctv.id ?? cctv.cctv_id}
                  value={cctv.cctv_id ?? cctv.id}
                >
                  {index + 1}번 CCTV
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleSearch}
            >
              검색
            </button>
          </div>

          <div className="zone-content">
            <div className="video-area">
              <div
                ref={canvasRef}
                className="zone-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
              >
                {activeCctv ? (
                  <img
                    src={`/api/video-feed/${activeCctv}`}
                    className="zone-video"
                    alt="CCTV 영상"
                  />
                ) : (
                  <div className="zone-placeholder">
                    CCTV를 선택한 후 검색 버튼을 눌러주세요.
                  </div>
                )}

                {normalizedZone && (
                  <div
                    className="zone-rect"
                    style={{
                      left: normalizedZone.x1,
                      top: normalizedZone.y1,
                      width:
                        normalizedZone.x2 -
                        normalizedZone.x1,
                      height:
                        normalizedZone.y2 -
                        normalizedZone.y1,
                    }}
                  >
                    {["tl", "tr", "bl", "br"].map(
                      (handle) => (
                        <div
                          key={handle}
                          className={`zone-handle ${handle}`}
                          onMouseDown={(event) => {
                            event.stopPropagation();
                            setIsResizing(true);
                            setActiveHandle(handle);
                          }}
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="guide-box">
                <img
                  src="/img/light.svg"
                  alt="안내"
                  className="light-icon"
                />

                <div>
                  <p>
                    마우스로 드래그하여 위험구역을 설정하세요.
                  </p>
                  <p>
                    사각형 영역의 4개 꼭짓점을 드래그하여 크기를
                    조절할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <aside className="zone-panel">
              <h2>위험구역 정보</h2>

              <label
                htmlFor="zoneName"
                className="field-label"
              >
                구역 이름
              </label>

              <input
                type="text"
                id="zoneName"
                className="zone-name-input"
                value={zoneName}
                onChange={(e) =>
                  setZoneName(e.target.value)
                }
                placeholder="위험구역 1"
              />

              <hr />

              <h3>좌표 정보</h3>

              {["x1", "y1", "x2", "y2"].map(
                (key) => (
                  <div className="coord-row" key={key}>
                    <label>{key.toUpperCase()}</label>

                    <input
                      type="number"
                      value={zone[key] ?? ""}
                      onChange={(e) =>
                        handleCoordChange(
                          key,
                          e.target.value
                        )
                      }
                    />

                    <span>px</span>
                  </div>
                )
              )}

              <div className="info-box">
                <img
                  src="/img/information.svg"
                  alt="안내"
                  className="zone-help-icon"
                />

                <div>
                  좌표는 CCTV 화면 기준 픽셀(px) 값입니다.
                  <br />
                  저장 후 진입 감지 기준으로 사용됩니다.
                </div>
              </div>

              <div className="zone-actions">
                <button
                  type="button"
                  className="reset-btn"
                  onClick={handleReset}
                >
                  다시 그리기
                </button>

                <button
                  type="button"
                  className="save-btn"
                  onClick={handleSave}
                >
                  저장
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

export default DangerZone;