/**
 * XNK API Client with JWT Bearer Interceptor, Toast Notifications, and Global Modal Controller
 */

export const API_BASE = "";

export function getToken() {
  return localStorage.getItem("xnk_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("xnk_token", token);
  else localStorage.removeItem("xnk_token");
}

// Toast notification helper
export function toast(message, type = "success") {
  const shelf = document.getElementById("toastShelf") || document.getElementById("toast-container");
  if (!shelf) return;

  const toastEl = document.createElement("div");
  toastEl.className = `toast toast-${type}`;
  const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ';
  toastEl.innerHTML = `<span style="font-size:14px; font-weight:bold;">${icon}</span> <span>${message}</span>`;
  shelf.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateX(20px)";
    toastEl.style.transition = "all 0.3s ease";
    setTimeout(() => toastEl.remove(), 300);
  }, 3500);
}

// Alias
export const showToast = toast;

// Global Modal Controller
export function openModal(title, contentHtml) {
  const overlay = document.getElementById("modalOverlay") || document.getElementById("modal-backdrop");
  const titleEl = document.getElementById("modalTitle") || document.getElementById("modal-title");
  const bodyEl = document.getElementById("modalBody") || document.getElementById("modal-body");
  const tabs = document.getElementById("modalTabs");
  const footer = document.getElementById("modalFooter");

  if (!overlay || !titleEl || !bodyEl) return;

  titleEl.innerHTML = title;
  bodyEl.innerHTML = contentHtml;
  if (tabs) tabs.style.display = "none";
  if (footer) footer.innerHTML = "";

  overlay.style.display = "flex";
  overlay.classList.add("show");
}

export function closeModal() {
  const overlay = document.getElementById("modalOverlay") || document.getElementById("modal-backdrop");
  if (overlay) {
    overlay.style.display = "none";
    overlay.classList.remove("show");
  }
}

window.closeGlobalModal = closeModal;
window.switchFormTab = function(tabId) {
  const g = document.getElementById("tabGeneral");
  const s = document.getElementById("tabSpec");
  const btns = document.querySelectorAll(".modal-tab-btn");
  if (tabId === "tabGeneral") {
    if (g) g.style.display = "block";
    if (s) s.style.display = "none";
    btns[0]?.classList.add("active");
    btns[1]?.classList.remove("active");
  } else {
    if (g) g.style.display = "none";
    if (s) s.style.display = "block";
    btns[0]?.classList.remove("active");
    btns[1]?.classList.add("active");
  }
};

// HTTP request helper
export async function request(endpoint, options = {}) {
  const headers = options.headers || {};
  const token = getToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    if (res.status === 401) {
      setToken(null);
      throw new Error("Hết phiên đăng nhập. Vui lòng đăng nhập lại.");
    }

    if (options.isBlob) {
      if (!res.ok) throw new Error("Tải file thất bại");
      return await res.blob();
    }

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || "Đã xảy ra lỗi khi gọi API.");
    }
    return json;
  } catch (err) {
    toast(err.message, "error");
    throw err;
  }
}

export const api = {
  get: (url) => request(url, { method: "GET" }),
  post: (url, body) => request(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: "PUT", body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: "DELETE" }),
  upload: (url, formData) => request(url, { method: "POST", body: formData })
};
