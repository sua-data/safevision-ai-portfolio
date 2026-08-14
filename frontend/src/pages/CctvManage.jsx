import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../styles/cctv-manage.css";

const EMPTY_FORM = {
  cctv_id: "",
  cctv_name: "",
  location: "",
  stream_url: "",
  is_active: 1,
};

function CctvManage() {
  const [cctvList, setCctvList] = useState([]);
  const [keyword, setKeyword] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [form, setForm] = useState(EMPTY_FORM);

  const loadCctvList = async () => {
    try {
      const response = await fetch("/api/cctv");

      if (!response.ok) {
        throw new Error("CCTV 목록 조회 실패");
      }

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "CCTV 목록 조회 실패");
        return;
      }

      setCctvList(result.data ?? []);
    } catch (error) {
      console.error("CCTV 목록 조회 오류:", error);
      alert("CCTV 목록 조회 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    loadCctvList();
  }, []);

  const filteredList = useMemo(() => {
    const search = keyword.trim().toLowerCase();

    if (!search) {
      return cctvList;
    }

    return cctvList.filter((item) => {
      return (
        (item.cctv_name || "").toLowerCase().includes(search) ||
        (item.location || "").toLowerCase().includes(search) ||
        (item.cctv_id || "").toLowerCase().includes(search)
      );
    });
  }, [cctvList, keyword]);

  const totalCount = filteredList.length;

  const activeCount = filteredList.filter(
    (item) => Number(item.is_active) === 1
  ).length;

  const inactiveCount = filteredList.filter(
    (item) => Number(item.is_active) === 0
  ).length;

  const openAddModal = () => {
    setFormMode("add");
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setFormMode("edit");

    setForm({
      cctv_id: item.cctv_id,
      cctv_name: item.cctv_name || "",
      location: item.location || "",
      stream_url: item.stream_url || "",
      is_active: Number(item.is_active),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormMode("add");
    setForm(EMPTY_FORM);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "is_active"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const data = {
      cctv_id: form.cctv_id.trim(),
      cctv_name: form.cctv_name.trim(),
      location: form.location.trim(),
      stream_url: form.stream_url.trim(),
      is_active: Number(form.is_active),
    };

    if (!data.cctv_id || !data.cctv_name) {
      alert("CCTV ID와 CCTV명은 필수입니다.");
      return;
    }

    const url =
      formMode === "add"
        ? "/api/cctv"
        : `/api/cctv/${data.cctv_id}`;

    const method =
      formMode === "add"
        ? "POST"
        : "PUT";

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "저장 실패");
        return;
      }

      alert(result.message || "저장되었습니다.");

      closeModal();
      await loadCctvList();
    } catch (error) {
      console.error("CCTV 저장 오류:", error);
      alert("CCTV 저장 중 오류가 발생했습니다.");
    }
  };

  const deleteCctv = async (id) => {
    const confirmed = confirm(
      "해당 CCTV를 삭제 하시겠습니까?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/cctv/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!result.success) {
        alert(result.message || "삭제 처리 실패");
        return;
      }

      alert(result.message || "삭제되었습니다.");

      await loadCctvList();
    } catch (error) {
      console.error("CCTV 삭제 처리 오류:", error);
      alert("CCTV 삭제 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="app-layout cctv-page">
      <Sidebar />

      <main className="main">
        <div className="page-header">
          <div>
            <h1>CCTV 관리</h1>
            <p>
              CCTV 등록 정보와 사용 상태를 관리합니다.
            </p>
          </div>

          <button
            type="button"
            className="primary-btn"
            onClick={openAddModal}
          >
            CCTV 등록
          </button>
        </div>

        <section className="summary-grid">
          <div className="cctv-summary-card">
            <span>전체 CCTV</span>
            <strong>{totalCount}</strong>
          </div>

          <div className="cctv-summary-card">
            <span>사용 중</span>
            <strong>{activeCount}</strong>
          </div>

          <div className="cctv-summary-card">
            <span>미사용</span>
            <strong>{inactiveCount}</strong>
          </div>
        </section>

        <section className="content-card">
          <div className="table-toolbar">
            <div>
              <h2>CCTV 목록</h2>
              <p>
                설치 위치, 스트리밍 주소, 사용 여부를
                확인합니다.
              </p>
            </div>

            <div className="search-box">
              <input
                type="text"
                value={keyword}
                onChange={(e) =>
                  setKeyword(e.target.value)
                }
                placeholder="CCTV명 또는 위치 검색"
              />

              <button type="button">
                검색
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="cctv-table">
              <thead>
                <tr>
                  <th>CCTV ID</th>
                  <th>CCTV명</th>
                  <th>설치 위치</th>
                  <th>스트리밍 주소</th>
                  <th>상태</th>
                  <th>등록일</th>
                  <th>관리</th>
                </tr>
              </thead>

              <tbody>
                {filteredList.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      style={{
                        textAlign: "center",
                        color: "#6b7280",
                      }}
                    >
                      조회된 CCTV가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const active =
                      Number(item.is_active) === 1;

                    return (
                      <tr key={item.cctv_id}>
                        <td>{item.cctv_id}</td>
                        <td>{item.cctv_name}</td>
                        <td>
                          {item.location || "-"}
                        </td>
                        <td>
                          {item.stream_url || "-"}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${
                              active
                                ? "status-active"
                                : "status-inactive"
                            }`}
                          >
                            {active
                              ? "사용"
                              : "미사용"}
                          </span>
                        </td>

                        <td>
                          {item.created_at || "-"}
                        </td>

                        <td>
                          <div className="action-btns">
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() =>
                                openEditModal(item)
                              }
                            >
                              수정
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              onClick={() =>
                                deleteCctv(
                                  item.cctv_id
                                )
                              }
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <div
        className={`modal-backdrop ${
          modalOpen ? "active" : ""
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeModal();
          }
        }}
      >
        <div className="cctv-modal">
          <div className="modal-header">
            <h2>
              {formMode === "add"
                ? "CCTV 등록"
                : "CCTV 수정"}
            </h2>

            <button
              type="button"
              className="close-btn"
              onClick={closeModal}
            >
              ×
            </button>
          </div>

          <form
            id="cctvForm"
            onSubmit={handleSubmit}
          >
            <label>
              CCTV ID
              <input
                type="text"
                name="cctv_id"
                value={form.cctv_id}
                onChange={handleChange}
                placeholder="예: cctv04"
                disabled={formMode === "edit"}
                required
              />
            </label>

            <label>
              CCTV명
              <input
                type="text"
                name="cctv_name"
                value={form.cctv_name}
                onChange={handleChange}
                placeholder="예: CCTV-04"
                required
              />
            </label>

            <label>
              설치 위치
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="예: 1층 출입구"
              />
            </label>

            <label>
              스트리밍 주소
              <input
                type="text"
                name="stream_url"
                value={form.stream_url}
                onChange={handleChange}
                placeholder="예: /api/video-feed/cctv04"
              />
            </label>

            <label>
              사용 여부

              <select
                name="is_active"
                value={form.is_active}
                onChange={handleChange}
              >
                <option value="1">사용</option>
                <option value="0">미사용</option>
              </select>
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={closeModal}
              >
                취소
              </button>

              <button
                type="submit"
                className="primary-btn"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CctvManage;