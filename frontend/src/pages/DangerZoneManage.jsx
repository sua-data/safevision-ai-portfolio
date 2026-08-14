import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import "../styles/danger-zone-manage.css";

const BASE_WIDTH = 1280;
const BASE_HEIGHT = 720;

function formatDate(dateText) {
  if (!dateText) {
    return "-";
  }

  return dateText.replace("T", " ").slice(0, 19);
}

function DangerZoneManage() {
  const [zones, setZones] = useState([]);
  const [previewZone, setPreviewZone] = useState(null);

  const [previewSize, setPreviewSize] = useState({
    width: 800,
    height: 450,
  });

  const previewBoxRef = useRef(null);

  const loadDangerZones = async () => {
    try {
      const response = await fetch("/api/danger-zone");

      if (!response.ok) {
        throw new Error("위험구역 목록 조회 실패");
      }

      const result = await response.json();

      if (!result.success) {
        alert("위험구역 목록 조회 실패");
        return;
      }

      setZones(result.data ?? []);
    } catch (error) {
      console.error(error);
      alert("서버 연결 오류");
    }
  };

  useEffect(() => {
    loadDangerZones();
  }, []);

  useEffect(() => {
    if (!previewZone || !previewBoxRef.current) {
      return;
    }

    const updatePreviewSize = () => {
      const box = previewBoxRef.current;

      if (!box) {
        return;
      }

      setPreviewSize({
        width: box.clientWidth,
        height: box.clientHeight,
      });
    };

    requestAnimationFrame(updatePreviewSize);

    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(previewBoxRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [previewZone]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setPreviewZone(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleDelete = async (zoneId) => {
    const ok = confirm("해당 위험구역을 삭제하시겠습니까?");

    if (!ok) {
      return;
    }

    try {
      const response = await fetch(
        `/api/danger-zone/zone/${zoneId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "삭제 실패");
        return;
      }

      await loadDangerZones();
    } catch (error) {
      console.error("위험구역 삭제 오류:", error);
      alert("서버 오류로 위험구역을 삭제하지 못했습니다.");
    }
  };

  const openPreview = (zone) => {
    setPreviewZone(zone);
  };

  const closePreview = () => {
    setPreviewZone(null);
  };

  const scaleX = previewSize.width / BASE_WIDTH;
  const scaleY = previewSize.height / BASE_HEIGHT;

  const previewRectStyle = previewZone
    ? {
        left: `${previewZone.x1 * scaleX}px`,
        top: `${previewZone.y1 * scaleY}px`,
        width: `${(previewZone.x2 - previewZone.x1) * scaleX}px`,
        height: `${(previewZone.y2 - previewZone.y1) * scaleY}px`,
      }
    : {};

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main">
        <h1>위험구역 설정</h1>

        <div className="zone-tabs">
          <NavLink
            to="/danger-zone"
            className="zone-tab"
          >
            지정
          </NavLink>

          <NavLink
            to="/danger-zone-manage"
            className="zone-tab active"
          >
            관리
          </NavLink>
        </div>

        <section className="manage-card">
          <h2>CCTV 목록</h2>

          <table className="zone-table">
            <thead>
              <tr>
                <th>CCTV ID</th>
                <th>CCTV명</th>
                <th>위험구역 명</th>
                <th>좌표값</th>
                <th>최신 수정일</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {zones.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    등록된 위험구역이 없습니다.
                  </td>
                </tr>
              ) : (
                zones.map((zone) => (
                  <tr key={zone.zone_id}>
                    <td>{zone.cctv_id}</td>
                    <td>{zone.cctv_name}</td>
                    <td>{zone.zone_name}</td>

                    <td>
                      <button
                        type="button"
                        className="coord-btn"
                        onClick={() => openPreview(zone)}
                      >
                        X1:{zone.x1}, Y1:{zone.y1},
                        X2:{zone.x2}, Y2:{zone.y2}
                      </button>
                    </td>

                    <td>
                      {formatDate(zone.updated_at)}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() =>
                          handleDelete(zone.zone_id)
                        }
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>

      {previewZone && (
        <div
          className="zone-modal"
          style={{ display: "flex" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
        >
          <div className="zone-modal-content">
            <div className="zone-modal-header">
              <h3>위험구역 미리보기</h3>

              <button
                type="button"
                onClick={closePreview}
              >
                ×
              </button>
            </div>

            <div
              ref={previewBoxRef}
              className="zone-preview-box"
            >
              <img
                src={`/api/video-feed/${previewZone.cctv_id}`}
                alt="CCTV 화면"
              />

              <div
                className="zone-preview-rect"
                style={previewRectStyle}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DangerZoneManage;