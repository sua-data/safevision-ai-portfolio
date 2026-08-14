import { NavLink, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem("isLogin");
    alert("로그아웃되었습니다.");
    navigate("/login");
  };

  const menuItems = [
    {
      path: "/dashboard",
      label: "대시보드",
      icon: "/img/dashboard.svg",
    },
    {
      path: "/monitoring",
      label: "실시간 모니터링",
      icon: "/img/monitoring.svg",
    },
    {
      path: "/event-log",
      label: "이벤트 로그",
      icon: "/img/event-log.svg",
    },
    {
      path: "/statistics",
      label: "통계 분석",
      icon: "/img/statistics.svg",
    },
    {
      path: "/danger-zone",
      label: "위험구역 설정",
      icon: "/img/danger-zone.svg",
    },
    {
      path: "/cctv-manage",
      label: "CCTV 관리",
      icon: "/img/cctv-camera.svg",
    },
  ];

  return (
    <aside className="sidebar">
      <div className="logo">
        <img
          src="/img/logo.svg"
          alt="SafeVision AI"
          className="brand-icon"
        />

        <span className="logo-text">
          SafeVision <strong>AI</strong>
        </span>
      </div>

      <nav className="menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `menu-item ${isActive ? "active" : ""}`
            }
          >
            <img src={item.icon} alt="" className="menu-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        type="button"
        className="logout-item"
        onClick={handleLogout}
      >
        <img
          src="/img/logout-icon.svg"
          alt=""
          className="logout-icon"
        />
        <span>로그아웃</span>
      </button>
    </aside>
  );
}

export default Sidebar;