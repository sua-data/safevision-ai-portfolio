import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/login.css";

const ADMIN_ID = "admin";
const ADMIN_PASSWORD = "1234";

function Login() {
  const navigate = useNavigate();

  const [adminId, setAdminId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveId, setSaveId] = useState(false);

  useEffect(() => {
    const savedAdminId = localStorage.getItem("savedAdminId");

    if (savedAdminId) {
      setAdminId(savedAdminId);
      setSaveId(true);
    }
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();

    const id = adminId.trim();
    const password = adminPassword.trim();

    if (!id || !password) {
      alert("아이디와 비밀번호를 입력하세요.");
      return;
    }

    if (id !== ADMIN_ID || password !== ADMIN_PASSWORD) {
      alert("아이디 또는 비밀번호가 일치하지 않습니다.");
      return;
    }

    if (saveId) {
      localStorage.setItem("savedAdminId", id);
    } else {
      localStorage.removeItem("savedAdminId");
    }

    sessionStorage.setItem("isLogin", "true");

    alert("로그인되었습니다.");

    navigate("/dashboard");
  };

  return (
    <main className="login-page">
      <section className="login-brand-section">
        <div className="brand-content">
          <div className="brand-logo">
            <img
              src="/img/logo.svg"
              alt="SafeVision AI Logo"
              className="shield-icon"
            />

            <h1>
              SafeVision <span>AI</span>
            </h1>
          </div>

          <p className="brand-subtitle">
            스마트 안전 관리 시스템
          </p>
        </div>

        <div className="construction-visual" />
      </section>

      <section className="login-card">
        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <h2>관리자 로그인</h2>

          <div className="form-group">
            <label htmlFor="admin-id">
              아이디
            </label>

            <input
              id="admin-id"
              type="text"
              value={adminId}
              onChange={(e) =>
                setAdminId(e.target.value)
              }
              placeholder="아이디를 입력하세요"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">
              비밀번호
            </label>

            <input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) =>
                setAdminPassword(e.target.value)
              }
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>

          <div className="option-row">
            <label className="check-label">
              <input
                type="checkbox"
                checked={saveId}
                onChange={(e) =>
                  setSaveId(e.target.checked)
                }
              />

              <span>아이디 저장</span>
            </label>
          </div>

          <button
            type="submit"
            className="login-button"
          >
            로그인
          </button>
        </form>

        <p className="copyright">
          © 2026 SafeVision-AI. All rights reserved.
        </p>
      </section>
    </main>
  );
}

export default Login;