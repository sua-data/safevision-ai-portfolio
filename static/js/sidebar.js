function setActiveSidebar() {
  const menuItems = document.querySelectorAll(".menu-item");
  const currentPath = window.location.pathname;

  menuItems.forEach((item) => {
    const pageName = item.dataset.page;

    item.classList.remove("active");

    if (pageName && currentPath.includes(pageName)) {
      item.classList.add("active");
    }

    item.addEventListener("click", () => {
      menuItems.forEach((menu) => menu.classList.remove("active"));
      item.classList.add("active");
    });
  });
}