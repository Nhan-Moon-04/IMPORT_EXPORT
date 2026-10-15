// frontend/src/app.js
import { auth } from './core/auth.js';
import { api, toast, openModal, closeModal, showConfirm } from './core/api.js';

import { renderDashboard } from './features/dashboard/dashboard.js';
import { renderProducts } from './features/products/products.js';
import { renderProductHistory } from './features/products/productHistory.js';
import { renderHsCodes } from './features/products/hsCodes.js';
import { renderShipments, renderShipmentForm } from './features/shipments/shipments.js';
import { renderShipmentDetail } from './features/shipments/shipmentDetail.js';
import { renderOrders } from './features/orders/orders.js';
import { renderInvoices } from './features/invoices/invoices.js';
import { renderBillOfLading } from './features/billOfLading/billOfLading.js';
import { renderPartners } from './features/partners/partners.js';
import { renderDocuments } from './features/documents/documents.js';
import { renderExcelTool } from './features/excel/excel.js';
import { renderCustoms } from './features/customs/customs.js';
import { renderShipping } from './features/shipping/shipping.js';
import { renderFinance } from './features/finance/finance.js';
import { renderReports } from './features/reports/reports.js';
import { renderSystem } from './features/system/system.js';
import { renderSearchCenter } from './features/search/search.js';

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
  'shipment-detail': 'Chứng Từ Lô Hàng Xuất Nhập Khẩu',
  'shipment-form': 'Thêm / Sửa Lô Hàng',
  'orders': 'Đơn Mua / Bán Sợi (PO / SO)',
  'invoices': 'Hóa Đơn Thương Mại (Commercial Invoices)',
  'sales-contracts': 'Hợp Đồng Bán Hàng (Sales Contracts)',
  'packing-lists': 'Phiếu Đóng Gói (Packing Lists)',
  'bill-of-lading': 'Vận Đơn Đường Biển (Bill of Lading - B/L)',
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
  'settings': 'Cấu Hình Hệ Thống',
  'search': '🔎 Tra Cứu Tổng Hợp Toàn Hệ Thống',
  'search-products': 'Tra Cứu Sản Phẩm',
  'search-suppliers': 'Tra Cứu Nhà Cung Cấp',
  'search-customers': 'Tra Cứu Khách Hàng',
  'search-invoices': 'Tra Cứu Invoice & Hợp Đồng',
  'search-customs': 'Tra Cứu Tờ Khai Hải Quan',
  'search-containers': 'Tra Cứu Container & Seal'
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
  if (parts.length >= 2 && (parts[0] === 'shipments' || parts[0] === 'shipment-detail' || parts[0] === 'shipment-form')) {
    return { tab: parts[0], param: parts[1] };
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

  // Sidebar toggle
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const sidebar = document.querySelector('.amis-sidebar');
  if (btnToggleSidebar && sidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

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

  // Language toggle
  const langToggle = document.getElementById('btn-lang-toggle');
  if (langToggle) {
    langToggle.addEventListener('click', () => {
      const current = langToggle.textContent.trim();
      const next = current === 'VN' ? 'EN' : 'VN';
      langToggle.textContent = next;
      localStorage.setItem('lang', next);
      toast(`Đã chuyển đổi sang ngôn ngữ: ${next === 'VN' ? 'Tiếng Việt' : 'English'}`, 'success');
      // Later: Implement actual translation update logic here
    });
    const savedLang = localStorage.getItem('lang');
    if (savedLang) langToggle.textContent = savedLang;
  }

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

  // User Profile Dropdown toggle & actions
  const userProfileBtn = document.getElementById('user-profile-btn');
  const userProfileMenu = document.getElementById('user-profile-menu');
  if (userProfileBtn && userProfileMenu) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.closeQuickMenu?.();
      const isOpen = userProfileMenu.style.display === 'block';
      userProfileMenu.style.display = isOpen ? 'none' : 'block';
      userProfileBtn.classList.toggle('active', !isOpen);
    });

    document.addEventListener('click', () => {
      userProfileMenu.style.display = 'none';
      userProfileBtn.classList.remove('active');
    });

    userProfileMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  const closeUserMenu = () => {
    if (userProfileMenu) {
      userProfileMenu.style.display = 'none';
      userProfileBtn?.classList.remove('active');
    }
  };

  document.getElementById('menu-user-profile')?.addEventListener('click', () => {
    closeUserMenu();
    openUserProfileModal();
  });

  document.getElementById('menu-user-password')?.addEventListener('click', () => {
    closeUserMenu();
    openChangePasswordModal();
  });

  document.getElementById('menu-user-settings')?.addEventListener('click', () => {
    closeUserMenu();
    navigateTo('settings', true);
  });

  document.getElementById('menu-user-permissions')?.addEventListener('click', () => {
    closeUserMenu();
    navigateTo('users', true);
  });

  document.getElementById('menu-user-audit')?.addEventListener('click', () => {
    closeUserMenu();
    navigateTo('audit-logs', true);
  });

  document.getElementById('menu-user-backup')?.addEventListener('click', () => {
    closeUserMenu();
    navigateTo('backup', true);
  });

  document.getElementById('menu-user-logout')?.addEventListener('click', () => {
    closeUserMenu();
    handleLogout();
  });

  // Old Logout button (if still present in toolbar)
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLogout();
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
    targetPath = (tab === 'shipment-detail' || tab === 'shipment-form') ? `/${tab}?id=${param}` : `/${tab}/${param}`;
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
      renderProducts(mainContent);
      break;

    case 'hs-codes':
      renderHsCodes(mainContent);
      break;

    case 'product-history':
      renderProductHistory(mainContent, param);
      break;

    case 'shipments':
      renderShipments(mainContent, 'All');
      break;
    case 'shipments-import':
      renderShipments(mainContent, 'Import');
      break;
    case 'shipments-export':
      renderShipments(mainContent, 'Export');
      break;

    case 'shipment-detail':
      renderShipmentDetail(mainContent, param || 'SHP-20260806-LCW');
      break;
      
    case 'shipment-form':
      renderShipmentForm(mainContent, param);
      break;

    case 'orders':
      renderOrders(mainContent);
      break;

    case 'invoices':
      renderInvoices(mainContent, 'Invoice');
      break;
    case 'sales-contracts':
      renderInvoices(mainContent, 'SalesContract');
      break;
    case 'packing-lists':
      renderInvoices(mainContent, 'PackingList');
      break;
    case 'bill-of-lading':
      renderBillOfLading(mainContent);
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
      renderPartners(mainContent, tab);
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

    case 'search':
      renderSearchCenter(mainContent, 'all', param);
      break;
    case 'search-products':
      renderSearchCenter(mainContent, 'products', param);
      break;
    case 'search-suppliers':
      renderSearchCenter(mainContent, 'suppliers', param);
      break;
    case 'search-customers':
      renderSearchCenter(mainContent, 'customers', param);
      break;
    case 'search-invoices':
      renderSearchCenter(mainContent, 'invoices', param);
      break;
    case 'search-customs':
      renderSearchCenter(mainContent, 'customs', param);
      break;
    case 'search-containers':
      renderSearchCenter(mainContent, 'containers', param);
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
  const displayName = user?.fullName || user?.name || user?.username || 'admin';
  const initial = (displayName || 'A')[0].toUpperCase();

  if (userNameEl) userNameEl.textContent = displayName;
  if (userAvatarEl) userAvatarEl.textContent = initial;

  // Cập nhật thông tin trong dropdown menu
  const dropAvatar = document.getElementById('user-dropdown-avatar');
  const dropName = document.getElementById('user-dropdown-name');
  const dropEmail = document.getElementById('user-dropdown-email');
  const dropRole = document.getElementById('user-dropdown-role');

  if (dropAvatar) dropAvatar.textContent = initial;
  if (dropName) dropName.textContent = displayName;
  if (dropEmail) dropEmail.textContent = user?.email || (user?.username ? `${user.username}@xnk-logistics.vn` : 'admin@xnk-logistics.vn');
  if (dropRole) dropRole.textContent = user?.roleName || 'Administrator';
}

async function handleLogout() {
  const confirmed = await showConfirm({
    title: 'Đăng Xuất Tài Khoản',
    message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống IMEX N không?',
    type: 'warning',
    confirmText: 'Đăng xuất',
    cancelText: 'Ở lại'
  });

  if (confirmed) {
    auth.logout();
    showLoginScreen();
  }
}

function openUserProfileModal() {
  const user = auth.getUser() || { username: 'admin', fullName: 'Quản Trị Viên', email: 'admin@xnk-logistics.vn', phone: '0988 123 456', department: 'Phòng Xuất Nhập Khẩu', position: 'Trưởng phòng XNK' };
  const displayName = user.fullName || user.name || user.username || 'Quản trị viên';
  const initial = (displayName || 'A')[0].toUpperCase();

  const contentHtml = `
    <form id="form-user-profile" style="padding: 4px 0;">
      <div style="display:flex; align-items:center; gap:16px; padding: 14px 16px; background: linear-gradient(135deg, rgba(2, 102, 179, 0.08), rgba(0, 161, 82, 0.05)); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 18px;">
        <div style="width:52px; height:52px; border-radius:50%; background:linear-gradient(135deg, var(--amis-blue), #2563eb); color:#fff; display:flex; align-items:center; justify-content:center; font-size:22px; font-weight:700; box-shadow:0 3px 8px rgba(2,102,179,0.3); flex-shrink:0;">
          ${initial}
        </div>
        <div>
          <div style="font-weight:700; font-size:15px; color:var(--amis-text);">${displayName}</div>
          <div style="font-size:12px; color:var(--amis-text-muted); margin-top:2px;">Tài khoản đăng nhập: <strong style="color:var(--amis-blue); font-family:monospace;">${user.username || 'admin'}</strong></div>
          <span class="status-chip chip-delivered" style="font-size:11px; margin-top:4px; display:inline-block;">${user.roleName || 'Administrator (Toàn quyền)'}</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
        <div class="form-group">
          <label class="form-label required">Họ và Tên</label>
          <input type="text" id="prof-fullname" class="form-input" required value="${user.fullName || user.name || 'Quản Trị Viên'}">
        </div>
        <div class="form-group">
          <label class="form-label">Tên Đăng Nhập</label>
          <input type="text" class="form-input" disabled value="${user.username || 'admin'}" style="background:#f1f5f9; cursor:not-allowed; opacity:0.85;">
        </div>
        <div class="form-group">
          <label class="form-label required">Email</label>
          <input type="email" id="prof-email" class="form-input" required value="${user.email || 'admin@xnk-logistics.vn'}">
        </div>
        <div class="form-group">
          <label class="form-label">Số Điện Thoại</label>
          <input type="tel" id="prof-phone" class="form-input" value="${user.phone || '0988 123 456'}" placeholder="09xx xxx xxx">
        </div>
        <div class="form-group">
          <label class="form-label">Phòng Ban</label>
          <input type="text" id="prof-dept" class="form-input" value="${user.department || 'Phòng Xuất Nhập Khẩu'}" placeholder="VD: Phòng Logistics">
        </div>
        <div class="form-group">
          <label class="form-label">Chức Vụ</label>
          <input type="text" id="prof-pos" class="form-input" value="${user.position || 'Trưởng phòng XNK'}" placeholder="VD: Chuyên viên">
        </div>
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-default" onclick="closeModal()">Đóng</button>
    <button type="submit" form="form-user-profile" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Lưu Thay Đổi
    </button>
  `;

  openModal('Thông Tin Hồ Sơ Cá Nhân', contentHtml, footerHtml);

  document.getElementById('form-user-profile')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      ...user,
      fullName: document.getElementById('prof-fullname')?.value?.trim() || user.fullName,
      name: document.getElementById('prof-fullname')?.value?.trim() || user.name,
      email: document.getElementById('prof-email')?.value?.trim() || user.email,
      phone: document.getElementById('prof-phone')?.value?.trim() || user.phone,
      department: document.getElementById('prof-dept')?.value?.trim() || user.department,
      position: document.getElementById('prof-pos')?.value?.trim() || user.position,
    };
    localStorage.setItem('xnk_user', JSON.stringify(updated));
    updateUserUI();
    closeModal();
    toast('Cập nhật hồ sơ tài khoản thành công!', 'success');
  });
}

function openChangePasswordModal() {
  const contentHtml = `
    <form id="form-change-pwd" style="padding: 4px 0;">
      <div style="background:#eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-md); padding: 12px 14px; font-size: 12.5px; color:#1e40af; margin-bottom: 16px; display:flex; gap:10px; align-items:flex-start;">
        <span style="font-size:18px; line-height:1;">🛡️</span>
        <div style="line-height:1.4;">
          <strong>Bảo mật tài khoản:</strong> Mật khẩu mới cần tối thiểu 6 ký tự để bảo vệ an toàn cho dữ liệu xuất nhập khẩu.
        </div>
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label required">Mật Khẩu Hiện Tại</label>
        <input type="password" id="pwd-current" class="form-input" required placeholder="Nhập mật khẩu hiện tại của bạn">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label class="form-label required">Mật Khẩu Mới</label>
        <input type="password" id="pwd-new" class="form-input" required minlength="6" placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)">
      </div>
      <div class="form-group" style="margin-bottom:6px;">
        <label class="form-label required">Xác Nhận Mật Khẩu Mới</label>
        <input type="password" id="pwd-confirm" class="form-input" required minlength="6" placeholder="Nhập lại mật khẩu mới">
      </div>
    </form>
  `;

  const footerHtml = `
    <button type="button" class="btn btn-default" onclick="closeModal()">Hủy</button>
    <button type="submit" form="form-change-pwd" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      Cập Nhật Mật Khẩu
    </button>
  `;

  openModal('Đổi Mật Khẩu Đăng Nhập', contentHtml, footerHtml);

  document.getElementById('form-change-pwd')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = document.getElementById('pwd-current')?.value;
    const pNew = document.getElementById('pwd-new')?.value;
    const pConf = document.getElementById('pwd-confirm')?.value;

    if (!cur) {
      toast('Vui lòng nhập mật khẩu hiện tại', 'warning');
      return;
    }
    if (pNew.length < 6) {
      toast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning');
      return;
    }
    if (pNew !== pConf) {
      toast('Mật khẩu xác nhận không trùng khớp với mật khẩu mới', 'error');
      return;
    }

    closeModal();
    toast('Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng.', 'success');
  });
}

window.appNavigateTo = (tab, param = null) => navigateTo(tab, true, param);
