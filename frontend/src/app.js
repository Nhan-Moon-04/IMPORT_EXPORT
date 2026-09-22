// frontend/src/app.js
import { auth } from './core/auth.js';
import { api, toast, openModal, closeModal } from './core/api.js';
import { i18n, t, setLanguage } from './core/i18n.js';

import { renderDashboard } from './features/dashboard/dashboard.js';
import { renderProducts } from './features/products/products.js';
import { renderShipments } from './features/shipments/shipments.js';
import { renderOrders } from './features/orders/orders.js';
import { renderInvoices } from './features/invoices/invoices.js';
import { renderPartners } from './features/partners/partners.js';
import { renderDocuments } from './features/documents/documents.js';
import { renderExcelTool } from './features/excel/excel.js';

let currentTab = 'dashboard';

// Route mapping
const ROUTES = {
  '': 'dashboard',
  'dashboard': 'dashboard',
  'products': 'products',
  'product': 'products',
  'shipments': 'shipments',
  'shipment': 'shipments',
  'orders': 'orders',
  'order': 'orders',
  'invoices': 'invoices',
  'invoice': 'invoices',
  'partners': 'partners',
  'partner': 'partners',
  'suppliers': 'partners',
  'documents': 'documents',
  'document': 'documents',
  'upload': 'documents',
  'excel': 'excel'
};

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  initGlobalEvents();
  
  // Determine initial route from URL pathname (or hash fallback)
  let path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (!path && window.location.hash) {
    path = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  }
  const initialRoute = ROUTES[path] || 'dashboard';

  if (!auth.isAuthenticated()) {
    showLoginModal(initialRoute);
  } else {
    updateUserUI();
    navigateTo(initialRoute, false);
  }
});

function initGlobalEvents() {
  // Navigation tabs click handler
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) navigateTo(tab, true);
    });
  });

  // Handle browser Back / Forward navigation
  window.addEventListener('popstate', () => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    const route = ROUTES[path] || 'dashboard';
    navigateTo(route, false);
  });

  // Global search input
  const searchInput = document.getElementById('global-search-input');
  const searchResults = document.getElementById('global-search-results');
  if (searchInput && searchResults) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();
      if (query.length < 2) {
        searchResults.style.display = 'none';
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await api.get(`/api/search?query=${encodeURIComponent(query)}`);
          renderSearchResults(res.data, searchResults);
        } catch {
          searchResults.style.display = 'none';
        }
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
  }

  // Keyboard shortcut Ctrl + K for search
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput?.focus();
    }
  });

  // Theme toggle
  const themeToggle = document.getElementById('btn-theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Language selector
  const langSelect = document.getElementById('lang-select');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  // Logout button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      auth.logout();
      showLoginModal();
    });
  }

  // Close modal when clicking backdrop
  const modalBackdrop = document.getElementById('modal-backdrop');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
}

export function navigateTo(tab, updateHistory = true) {
  currentTab = tab;

  // Update URL in address bar to match requested route e.g. /products
  const targetPath = `/${tab}`;
  if (updateHistory && window.location.pathname !== targetPath) {
    history.pushState({ tab }, '', targetPath);
  }

  // Update active class in sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tab) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update page title & breadcrumb
  const pageTitle = document.getElementById('page-title');
  const breadcrumbCurrent = document.getElementById('breadcrumb-current');
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const tabTitles = {
    dashboard: 'Bàn Làm Việc (Tổng Quan Xuất Nhập Khẩu)',
    shipments: 'Quản Lý Lô Hàng & Vận Đơn (Shipments & B/L)',
    orders: 'Đơn Hàng Mua / Bán Sợi (PO & Sales Orders)',
    products: 'Danh Mục Sản Phẩm Sợi (Yarn Catalog)',
    invoices: 'Hóa Đơn Thương Mại & Chứng Từ (Invoices)',
    partners: 'Danh Bạ Nhà Cung Cấp & Đối Tác (Suppliers)',
    documents: 'Quản Lý Hồ Sơ & Upload Chứng Từ (Documents)',
    excel: 'Tiện Ích Đọc & Nhập File Excel (SheetJS)'
  };

  if (pageTitle) pageTitle.textContent = tabTitles[tab] || 'Hệ Thống XNK';
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = tabTitles[tab] || tab;

  mainContent.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner"></div><p style="margin-top:10px; color:#6b7280;">Đang nạp dữ liệu...</p></div>';

  switch (tab) {
    case 'dashboard':
      renderDashboard(mainContent);
      break;
    case 'shipments':
      renderShipments(mainContent);
      break;
    case 'orders':
      renderOrders(mainContent);
      break;
    case 'products':
      renderProducts(mainContent);
      break;
    case 'invoices':
      renderInvoices(mainContent);
      break;
    case 'partners':
      renderPartners(mainContent);
      break;
    case 'documents':
      renderDocuments(mainContent);
      break;
    case 'excel':
      renderExcelTool(mainContent);
      break;
    default:
      renderDashboard(mainContent);
  }
}

function renderSearchResults(data, container) {
  if (!data || ((!data.products || data.products.length === 0) && (!data.shipments || data.shipments.length === 0) && (!data.suppliers || data.suppliers.length === 0))) {
    container.innerHTML = '<div style="padding:12px; font-size:12px; color:#6b7280;">Không tìm thấy kết quả phù hợp</div>';
    container.style.display = 'block';
    return;
  }

  let html = '<div style="max-height:360px; overflow-y:auto; padding:6px 0;">';
  
  if (data.products && data.products.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase;">Sản phẩm sợi</div>';
    data.products.slice(0, 4).forEach(p => {
      html += `
        <div class="search-item" style="padding:6px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('products')">
          <strong style="color:var(--amis-blue);">${p.code}</strong> - ${p.name}
        </div>
      `;
    });
  }

  if (data.shipments && data.shipments.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-top:6px;">Lô hàng</div>';
    data.shipments.slice(0, 4).forEach(s => {
      html += `
        <div class="search-item" style="padding:6px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('shipments')">
          <strong style="color:var(--amis-blue);">${s.code}</strong> (B/L: ${s.blNumber || '---'}) - ${s.status}
        </div>
      `;
    });
  }

  if (data.suppliers && data.suppliers.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-top:6px;">Nhà cung cấp</div>';
    data.suppliers.slice(0, 4).forEach(sp => {
      html += `
        <div class="search-item" style="padding:6px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('partners')">
          <strong style="color:var(--amis-blue);">${sp.code}</strong> - ${sp.name}
        </div>
      `;
    });
  }

  html += '</div>';
  container.innerHTML = html;
  container.style.display = 'block';
}

function showLoginModal(targetTab = 'dashboard') {
  const content = `
    <div style="text-align:center; padding:10px 0 20px;">
      <div style="width:48px; height:48px; background:#0266b3; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-weight:800; font-size:22px; margin-bottom:12px;">M</div>
      <h3 style="font-size:18px; font-weight:700; color:var(--amis-sidebar);">MISA AMIS - ĐĂNG NHẬP XNK</h3>
      <p style="font-size:12px; color:#6b7280;">Hệ thống Quản lý Xuất Nhập Khẩu Sợi Dệt</p>
    </div>
    <form id="login-form">
      <div class="form-group" style="margin-bottom:14px;">
        <label>Tên đăng nhập / Email *</label>
        <input type="text" id="login-username" class="form-control" value="admin" required autofocus>
      </div>
      <div class="form-group" style="margin-bottom:20px;">
        <label>Mật khẩu *</label>
        <input type="password" id="login-password" class="form-control" value="Admin@123" required>
      </div>
      <button type="submit" class="btn btn-primary" style="width:100%; padding:10px; font-size:14px; justify-content:center;">
        Đăng Nhập Vào Hệ Thống
      </button>
      <div style="font-size:11px; color:#6b7280; text-align:center; margin-top:14px;">
        Tài khoản mặc định: <strong>admin</strong> / Mật khẩu: <strong>Admin@123</strong>
      </div>
    </form>
  `;

  openModal('Xác Thực Người Dùng', content);

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;

    const success = await auth.login(u, p);
    if (success) {
      closeModal();
      updateUserUI();
      navigateTo(targetTab, true);
    }
  });
}

function updateUserUI() {
  const user = auth.getUser();
  const userNameEl = document.getElementById('user-display-name');
  const userAvatarEl = document.getElementById('user-avatar');
  if (userNameEl) userNameEl.textContent = user?.name || user?.username || 'Quản trị viên';
  if (userAvatarEl) userAvatarEl.textContent = (user?.name || user?.username || 'A')[0].toUpperCase();
}

window.appNavigateTo = (tab) => navigateTo(tab, true);
