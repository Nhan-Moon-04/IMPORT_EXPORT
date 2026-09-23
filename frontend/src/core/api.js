/**
 * XNK API Client with JWT Bearer Interceptor, Toast Notifications, and Global Modal Controller
 */

export const API_BASE = "http://localhost:5000";

export function getToken() {
  return localStorage.getItem("xnk_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("xnk_token", token);
  else localStorage.removeItem("xnk_token");
}

// Toast notification helper - Rich version với icon
export function toast(message, type = "success", title = null) {
  let shelf = document.getElementById("toastShelf");
  if (!shelf) {
    shelf = document.createElement("div");
    shelf.id = "toastShelf";
    document.body.appendChild(shelf);
  }

  const icons = {
    success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    error:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    info:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
    warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
  };
  const defaultTitles = { success: 'Thành công', error: 'Lỗi', info: 'Thông báo', warning: 'Cảnh báo' };

  const toastEl = document.createElement("div");
  toastEl.className = `toast toast-${type}`;
  toastEl.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">
      <div class="toast-title">${title || defaultTitles[type] || ''}</div>
      <div class="toast-msg">${message}</div>
    </div>
  `;
  shelf.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = "0";
    toastEl.style.transform = "translateX(30px) scale(0.95)";
    setTimeout(() => toastEl.remove(), 320);
  }, 3800);
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

  if (title !== undefined) titleEl.innerHTML = title;
  if (contentHtml !== undefined) bodyEl.innerHTML = contentHtml;
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

window.openModal = openModal;
window.closeModal = closeModal;
window.closeGlobalModal = closeModal;

// =====================================================
// CONFIRM DIALOG - Dùng thay thế window.confirm()
// Trả về Promise<boolean>
// =====================================================
export function showConfirm({ title = 'Xác nhận', message = '', highlight = '', type = 'danger', confirmText = 'Xác nhận', cancelText = 'Hủy bỏ' } = {}) {
  return new Promise((resolve) => {
    // Tạo overlay nếu chưa có
    let overlay = document.getElementById('xnkConfirmOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'xnkConfirmOverlay';
      document.body.appendChild(overlay);
    }

    const iconSvgs = {
      danger: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
      warning: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
      info: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
    };

    const confirmBtnClass = type === 'danger' ? 'btn-danger' : type === 'warning' ? 'btn btn-orange' : 'btn-primary';

    overlay.innerHTML = `
      <div class="xnk-confirm-dialog" id="xnkConfirmDialog">
        <div class="xnk-confirm-icon-wrap">
          <div class="xnk-confirm-icon ${type}">${iconSvgs[type] || iconSvgs.danger}</div>
        </div>
        <div class="xnk-confirm-body">
          <p class="xnk-confirm-title">${title}</p>
          <p class="xnk-confirm-message">${message}${highlight ? `<br><span class="xnk-confirm-highlight">${highlight}</span>` : ''}</p>
        </div>
        <div class="xnk-confirm-footer">
          <button id="xnkConfirmCancel" class="btn btn-default">${cancelText}</button>
          <button id="xnkConfirmOk" class="btn ${confirmBtnClass}">${confirmText}</button>
        </div>
      </div>
    `;

    overlay.classList.add('active');

    const close = (result) => {
      overlay.classList.remove('active');
      resolve(result);
    };

    document.getElementById('xnkConfirmOk').onclick = () => close(true);
    document.getElementById('xnkConfirmCancel').onclick = () => close(false);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    }, { once: true });
  });
}

window.showConfirm = showConfirm;
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

    // Xử lý response rỗng (204 No Content hoặc body trống)
    const contentType = res.headers.get("content-type") || "";
    const contentLength = res.headers.get("content-length");
    const hasBody = contentType.includes("application/json") && contentLength !== "0";

    if (!hasBody && res.status === 204) return null;

    // Nếu không có body JSON thì không parse
    const text = await res.text();
    if (!text || text.trim() === "") {
      if (!res.ok) throw new Error("Đã xảy ra lỗi khi gọi API.");
      return null;
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error("Đã xảy ra lỗi khi gọi API.");
      return null;
    }

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
