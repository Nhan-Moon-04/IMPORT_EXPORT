// frontend/src/app.js
import { auth } from './core/auth.js';
import { api, toast, openModal, closeModal } from './core/api.js';

import { renderDashboard } from './features/dashboard/dashboard.js';
import { renderProducts } from './features/products/products.js';
import { renderShipments } from './features/shipments/shipments.js';
import { renderShipmentDetail } from './features/shipments/shipmentDetail.js';
import { renderOrders } from './features/orders/orders.js';
import { renderInvoices } from './features/invoices/invoices.js';
import { renderPartners } from './features/partners/partners.js';
import { renderDocuments } from './features/documents/documents.js';
import { renderExcelTool } from './features/excel/excel.js';
import { renderCustoms } from './features/customs/customs.js';
import { renderShipping } from './features/shipping/shipping.js';
import { renderFinance } from './features/finance/finance.js';
import { renderReports } from './features/reports/reports.js';
import { renderSystem } from './features/system/system.js';

let currentTab = 'dashboard';
let currentParam = null;

// Route Titles Map
const ROUTE_TITLES = {
  'dashboard': 'Tổng Quan Hệ Thống (Dashboard)',
  'products': 'Danh Mục Sản Phẩm Sợi',
  'product-history': 'Lịch Sử Nhập / Xuất Hàng Hóa',
  'hs-codes': 'Biểu Thuế & HS Code',
  'shipments-import': 'Lô Hàng Nhập Khẩu Sợi',
  'shipments-export': 'Lô Hàng Xuất Khẩu Sợi',
  'shipments': 'Tất Cả Lô Hàng & Vận Đơn',
  'shipment-detail': 'Chi Tiết Lô Hàng (10 Tabs Nghiệp Vụ)',
  'orders': 'Đơn Mua / Bán Sợi (PO / SO)',
  'invoices': 'Hóa Đơn Thương Mại (Commercial Invoices)',
  'packing-lists': 'Phiếu Đóng Gói (Packing Lists)',
  'documents': 'Kho Chứng Từ & Upload File',
  'booking': 'Booking Vận Tải Biển',
  'containers': 'Quản Lý Container & Số Chì (Seal)',
  'tracking': 'Theo Dõi Hải Trình Tàu / ETD / ETA',
  'customs-accounts': 'Tài Khoản Hải Quan & Token Điện Tử',
  'customs-declarations': 'Tờ Khai Hải Quan Điện Tử (VNACCS)',
  'customs-taxes': 'Thuế Hải Quan & C/O Form E',
  'partners-suppliers': 'Danh Bạ Nhà Cung Cấp',
  'partners-customers': 'Danh Bạ Khách Hàng',
  'forwarders': 'Hãng Tàu & Đại Lý Forwarder',
  'costs': 'Chi Phí Lô Hàng',
  'payments': 'Thanh Toán & Dòng Tiền Ngoại Tệ',
  'cost-allocation': 'Phân Bổ Giá Vốn (Landed Cost)',
  'reports-import': 'Báo Cáo Nhập Khẩu',
  'reports-export': 'Báo Cáo Xuất Khẩu',
  'excel': 'Xuất / Nhập File Excel (SheetJS)',
  'system-notifications': 'Thông Báo Tự Động',
  'users': 'Người Dùng & Phân Quyền',
  'audit-logs': 'Nhật Ký Hệ Thống (Audit Log)',
  'backup': 'Sao Lưu Dữ Liệu PostgreSQL',
  'settings': 'Cấu Hình Hệ Thống'
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', async () => {
  initGlobalEvents();

  // Resolve initial route from URL
  const initial = parseCurrentUrl();

  if (!auth.isAuthenticated()) {
    showLoginScreen();
  } else {
    showAppLayout();
    updateUserUI();
    navigateTo(initial.tab, false, initial.param);
  }
});

function showLoginScreen() {
  document.getElementById('app-layout').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

function showAppLayout() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';
}

function parseCurrentUrl() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const idFromQuery = searchParams.get('id');

  // Check path parts e.g. /shipments/SHP-20260806-LCW
  const parts = path.split('/');
  if (parts.length >= 2 && (parts[0] === 'shipments' || parts[0] === 'shipment-detail')) {
    return { tab: 'shipment-detail', param: parts[1] };
  }

  const baseTab = parts[0] || 'dashboard';
  return { tab: baseTab, param: idFromQuery };
}

function initGlobalEvents() {
  // Collapsible Accordion Sidebar Groups
  document.querySelectorAll('.nav-group-header').forEach(header => {
    header.addEventListener('click', () => {
      const group = header.closest('.nav-group');
      if (group) group.classList.toggle('open');
    });
  });

  // Nav Items click handler
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.getAttribute('data-tab');
      if (tab) navigateTo(tab, true);
    });
  });

  // Browser Back / Forward handler
  window.addEventListener('popstate', () => {
    const route = parseCurrentUrl();
    navigateTo(route.tab, false, route.param);
  });

  // Quick Create Dropdown toggle
  const btnQuickCreate = document.getElementById('btn-quick-create');
  const quickMenu = document.getElementById('quick-create-menu');
  if (btnQuickCreate && quickMenu) {
    btnQuickCreate.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = quickMenu.style.display === 'block';
      quickMenu.style.display = isOpen ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
      quickMenu.style.display = 'none';
    });
  }
  window.closeQuickMenu = () => {
    if (quickMenu) quickMenu.style.display = 'none';
  };

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

  // Hotkey Ctrl + K
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
      toast(`Đã chuyển sang giao diện ${next === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
    });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
  }

  // Login Form New
  const loginFormNew = document.getElementById('login-form-new');
  if (loginFormNew) {
    loginFormNew.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('login-username-new').value;
      const pass = document.getElementById('login-password-new').value;
      const submitBtn = loginFormNew.querySelector('.btn-login-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang xử lý...';

      try {
        await auth.login(user, pass);
        // Login success
        showAppLayout();
        updateUserUI();
        
        const currentRoute = parseCurrentUrl();
        navigateTo(currentRoute.tab, true, currentRoute.param);
      } catch (err) {
        // Handled in api.js by toast
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Đăng nhập';
      }
    });

    // Toggle password visibility
    const togglePwd = document.getElementById('toggle-password');
    if (togglePwd) {
      togglePwd.addEventListener('click', () => {
        const pwdInput = document.getElementById('login-password-new');
        if (pwdInput.type === 'password') {
          pwdInput.type = 'text';
          togglePwd.querySelector('.eye-slash').style.display = 'block';
        } else {
          pwdInput.type = 'password';
          togglePwd.querySelector('.eye-slash').style.display = 'none';
        }
      });
    }
  }

  // Logout button
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      auth.logout();
      showLoginScreen();
    });
  }

  // Modal backdrop click
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }
}

export function navigateTo(tab, updateHistory = true, param = null) {
  currentTab = tab;
  currentParam = param;

  // Build target path
  let targetPath = `/${tab}`;
  if (param) {
    targetPath = tab === 'shipment-detail' ? `/shipment-detail?id=${param}` : `/${tab}/${param}`;
  }

  // Update browser URL
  if (updateHistory && window.location.pathname + window.location.search !== targetPath) {
    history.pushState({ tab, param }, '', targetPath);
  }

  // Update active state in sidebar and expand parent group
  document.querySelectorAll('.nav-item').forEach(item => {
    const isCur = item.getAttribute('data-tab') === tab;
    item.classList.toggle('active', isCur);
    if (isCur) {
      const parentGroup = item.closest('.nav-group');
      if (parentGroup) parentGroup.classList.add('open');
    }
  });

  // Update page title & breadcrumb
  const breadcrumbCurrentNav = document.getElementById('breadcrumb-current-nav');
  const breadcrumbGroup = document.getElementById('breadcrumb-group');
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const displayTitle = ROUTE_TITLES[tab] || 'Hệ Thống XNK';
  if (breadcrumbCurrentNav) breadcrumbCurrentNav.textContent = displayTitle;

  // Try to find the group name from sidebar active item
  const activeNavItem = document.querySelector('.nav-item.active');
  if (activeNavItem && breadcrumbGroup) {
    const groupHeader = activeNavItem.closest('.nav-group')?.querySelector('.group-title');
    if (groupHeader) {
      breadcrumbGroup.textContent = groupHeader.textContent;
    }
  }

  mainContent.innerHTML = '<div style="padding:40px; text-align:center;"><div class="spinner"></div><p style="margin-top:10px; color:#6b7280;">Đang nạp dữ liệu...</p></div>';

  // Render view corresponding to selected route
  switch (tab) {
    case 'dashboard':
      renderDashboard(mainContent);
      break;

    case 'products':
    case 'product-history':
    case 'hs-codes':
      renderProducts(mainContent);
      break;

    case 'shipments':
    case 'shipments-import':
    case 'shipments-export':
      renderShipments(mainContent);
      break;

    case 'shipment-detail':
      renderShipmentDetail(mainContent, param || 'SHP-20260806-LCW');
      break;

    case 'orders':
      renderOrders(mainContent);
      break;

    case 'invoices':
    case 'packing-lists':
      renderInvoices(mainContent);
      break;

    case 'documents':
      renderDocuments(mainContent);
      break;

    case 'booking':
    case 'containers':
    case 'tracking':
      renderShipping(mainContent, tab);
      break;

    case 'customs-accounts':
    case 'customs-declarations':
    case 'customs-taxes':
      renderCustoms(mainContent, tab);
      break;

    case 'partners-suppliers':
    case 'partners-customers':
    case 'forwarders':
      renderPartners(mainContent);
      break;

    case 'costs':
    case 'payments':
    case 'cost-allocation':
      renderFinance(mainContent, tab);
      break;

    case 'reports-import':
    case 'reports-export':
      renderReports(mainContent, tab);
      break;

    case 'excel':
      renderExcelTool(mainContent);
      break;

    case 'system-notifications':
    case 'users':
    case 'audit-logs':
    case 'backup':
    case 'settings':
      renderSystem(mainContent, tab);
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

  if (data.shipments && data.shipments.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase;">Lô hàng</div>';
    data.shipments.slice(0, 4).forEach(s => {
      html += `
        <div class="search-item" style="padding:8px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('shipment-detail', '${s.id}')">
          <strong style="color:var(--amis-blue);">${s.code}</strong> (B/L: ${s.blNumber || '---'}) - <span class="status-chip chip-transit">${s.status}</span>
        </div>
      `;
    });
  }

  if (data.products && data.products.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-top:6px;">Sản phẩm sợi</div>';
    data.products.slice(0, 4).forEach(p => {
      html += `
        <div class="search-item" style="padding:8px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('products')">
          <strong style="color:var(--amis-blue);">${p.code}</strong> - ${p.name}
        </div>
      `;
    });
  }

  if (data.suppliers && data.suppliers.length > 0) {
    html += '<div style="padding:4px 12px; font-size:11px; font-weight:700; color:#6b7280; text-transform:uppercase; margin-top:6px;">Nhà cung cấp</div>';
    data.suppliers.slice(0, 4).forEach(sp => {
      html += `
        <div class="search-item" style="padding:8px 12px; cursor:pointer; font-size:12px; border-bottom:1px solid #f1f5f9;" onclick="window.appNavigateTo('partners-suppliers')">
          <strong style="color:var(--amis-blue);">${sp.code}</strong> - ${sp.name}
        </div>
      `;
    });
  }

  html += '</div>';
  container.innerHTML = html;
  container.style.display = 'block';
}

function showLoginModal(targetTab = 'dashboard', targetParam = null) {
  const content = `
    <div style="text-align:center; padding:10px 0 20px;">
      <div style="width:48px; height:48px; background:#0266b3; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:24px; margin-bottom:12px;">🚢</div>
      <h3 style="font-size:17px; font-weight:700; color:#0f1e36;">ĐĂNG NHẬP XNK LOGISTICS</h3>
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
      navigateTo(targetTab, true, targetParam);
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

window.appNavigateTo = (tab, param = null) => navigateTo(tab, true, param);
