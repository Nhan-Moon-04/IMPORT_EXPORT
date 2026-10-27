// frontend/src/features/system/system.js
import { api, toast, openModal, closeModal, showConfirm } from '../../core/api.js';
import { auth } from '../../core/auth.js';

// ============================================================================
// 1. TRANG HỒ SƠ CÁ NHÂN (USER PROFILE PAGE)
// ============================================================================
export function renderProfile(container) {
  const user = auth.getUser() || {
    username: 'admin',
    fullName: 'Quản Trị Viên',
    email: 'admin@xnk-logistics.vn',
    phone: '0988 123 456',
    department: 'Phòng Xuất Nhập Khẩu',
    position: 'Trưởng phòng Logistics',
    roleName: 'Administrator'
  };

  const displayName = user.fullName || user.name || user.username || 'Quản trị viên';
  const initial = (displayName || 'A')[0].toUpperCase();

  container.innerHTML = `
    <div class="profile-page-container">
      <div class="profile-grid">
        <!-- LEFT COLUMN: Profile Summary Card -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="profile-card">
            <div class="profile-avatar-banner">
              <div class="profile-big-avatar">${initial}</div>
              <div class="profile-name">${displayName}</div>
              <div class="profile-username">@${user.username || 'admin'}</div>
              <span class="status-chip chip-delivered" style="margin-top:8px; display:inline-block;">
                ${user.roleName || 'Administrator (Toàn quyền)'}
              </span>
            </div>

            <div class="profile-meta-list">
              <div class="profile-meta-item">
                <span class="profile-meta-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                  Email:
                </span>
                <span class="profile-meta-val">${user.email || 'admin@xnk-logistics.vn'}</span>
              </div>
              <div class="profile-meta-item">
                <span class="profile-meta-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                  Điện thoại:
                </span>
                <span class="profile-meta-val">${user.phone || '0988 123 456'}</span>
              </div>
              <div class="profile-meta-item">
                <span class="profile-meta-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  Phòng ban:
                </span>
                <span class="profile-meta-val">${user.department || 'Phòng Xuất Nhập Khẩu'}</span>
              </div>
              <div class="profile-meta-item">
                <span class="profile-meta-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Ngày tham gia:
                </span>
                <span class="profile-meta-val">01/01/2026</span>
              </div>
              <div class="profile-meta-item">
                <span class="profile-meta-label">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  Trạng thái:
                </span>
                <span class="status-chip chip-delivered" style="font-size:11px;">Hoạt động</span>
              </div>
            </div>
          </div>

          <!-- Security Action Quick Card -->
          <div class="profile-card">
            <div class="profile-card-header">
              <div class="profile-card-title">
                🛡️ Bảo Mật & Mật Khẩu
              </div>
            </div>
            <div class="profile-card-body" style="padding:16px;">
              <p style="font-size:13px; color:var(--amis-text-muted); line-height:1.4; margin-bottom:14px;">
                Đổi mật khẩu định kỳ giúp bảo vệ dữ liệu hợp đồng và lô hàng của bạn.
              </p>
              <button type="button" class="btn btn-default" id="btn-goto-password" style="width:100%; justify-content:center; gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                Chuyển Đến Trang Đổi Mật Khẩu
              </button>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Detailed Editable Profile Form -->
        <div class="profile-card">
          <div class="profile-card-header">
            <div class="profile-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Chi Tiết Hồ Sơ Cá Nhân
            </div>
            <span style="font-size:12px; color:var(--amis-text-muted);">Cập nhật thông tin tài khoản đang đăng nhập</span>
          </div>

          <div class="profile-card-body">
            <form id="profile-full-form">
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px 20px;">
                <div class="form-group">
                  <label class="form-label required">Họ và Tên</label>
                  <input type="text" id="p-fullname" class="form-input" required value="${user.fullName || user.name || 'Quản Trị Viên'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Tên Đăng Nhập</label>
                  <input type="text" class="form-input" disabled value="${user.username || 'admin'}" style="background:#f1f5f9; cursor:not-allowed; opacity:0.85;">
                </div>
                <div class="form-group">
                  <label class="form-label required">Địa Chỉ Email</label>
                  <input type="email" id="p-email" class="form-input" required value="${user.email || 'admin@xnk-logistics.vn'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Số Điện Thoại</label>
                  <input type="tel" id="p-phone" class="form-input" value="${user.phone || '0988 123 456'}" placeholder="09xx xxx xxx">
                </div>
                <div class="form-group">
                  <label class="form-label">Phòng Ban</label>
                  <input type="text" id="p-dept" class="form-input" value="${user.department || 'Phòng Xuất Nhập Khẩu'}" placeholder="VD: Phòng Logistics">
                </div>
                <div class="form-group">
                  <label class="form-label">Chức Vụ</label>
                  <input type="text" id="p-pos" class="form-input" value="${user.position || 'Trưởng phòng Logistics'}" placeholder="VD: Chuyên viên XNK">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                  <label class="form-label">Vai Trò Hệ Thống</label>
                  <input type="text" class="form-input" disabled value="${user.roleName || 'Administrator'} (Có quyền truy cập toàn bộ tính năng và phân quyền)" style="background:#f1f5f9; cursor:not-allowed;">
                </div>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:28px; border-top:1px solid var(--border-color); padding-top:18px;">
                <button type="button" class="btn btn-default" id="btn-reset-profile">Hủy Bỏ</button>
                <button type="submit" class="btn btn-primary" id="btn-save-profile">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event handlers
  document.getElementById('btn-goto-password')?.addEventListener('click', () => {
    window.appNavigateTo('change-password');
  });

  document.getElementById('btn-reset-profile')?.addEventListener('click', () => {
    renderProfile(container);
  });

  document.getElementById('profile-full-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const updated = {
      ...user,
      fullName: document.getElementById('p-fullname')?.value?.trim() || user.fullName,
      name: document.getElementById('p-fullname')?.value?.trim() || user.name,
      email: document.getElementById('p-email')?.value?.trim() || user.email,
      phone: document.getElementById('p-phone')?.value?.trim() || user.phone,
      department: document.getElementById('p-dept')?.value?.trim() || user.department,
      position: document.getElementById('p-pos')?.value?.trim() || user.position,
    };
    localStorage.setItem('xnk_user', JSON.stringify(updated));
    if (typeof window.updateUserUI === 'function') window.updateUserUI();
    toast('Cập nhật hồ sơ tài khoản thành công!', 'success');
    renderProfile(container);
  });
}

// ============================================================================
// 2. TRANG ĐỔI MẬT KHẨU (CHANGE PASSWORD PAGE)
// ============================================================================
export function renderChangePassword(container) {
  container.innerHTML = `
    <div class="password-page-container">
      <div class="password-card">
        <div style="text-align:center; margin-bottom:24px;">
          <div style="width:52px; height:52px; border-radius:50%; background:#eff6ff; color:var(--amis-blue); display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto; font-size:24px; box-shadow:0 2px 6px rgba(2,102,179,0.15);">
            🔒
          </div>
          <h2 style="font-size:18px; font-weight:700; color:var(--amis-text);">Đổi Mật Khẩu Đăng Nhập</h2>
          <p style="font-size:13px; color:var(--amis-text-muted); margin-top:4px;">
            Vui lòng nhập mật khẩu hiện tại và tạo mật khẩu mới an toàn cho tài khoản.
          </p>
        </div>

        <form id="page-change-password-form">
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label required">Mật Khẩu Hiện Tại</label>
            <div style="position:relative;">
              <input type="password" id="chg-pwd-current" class="form-input" required placeholder="Nhập mật khẩu hiện tại" style="padding-right:36px;">
              <span class="toggle-eye" data-target="chg-pwd-current" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); cursor:pointer; color:#94a3b8;">👁️</span>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label required">Mật Khẩu Mới</label>
            <div style="position:relative;">
              <input type="password" id="chg-pwd-new" class="form-input" required minlength="6" placeholder="Tối thiểu 6 ký tự" style="padding-right:36px;">
              <span class="toggle-eye" data-target="chg-pwd-new" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); cursor:pointer; color:#94a3b8;">👁️</span>
            </div>
            <div class="password-strength-bar">
              <div class="password-strength-fill" id="pwd-strength-indicator"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px; color:#64748b;">
              <span>Độ mạnh mật khẩu:</span>
              <strong id="pwd-strength-text">Chưa nhập</strong>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label required">Xác Nhận Mật Khẩu Mới</label>
            <div style="position:relative;">
              <input type="password" id="chg-pwd-confirm" class="form-input" required minlength="6" placeholder="Nhập lại mật khẩu mới" style="padding-right:36px;">
              <span class="toggle-eye" data-target="chg-pwd-confirm" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); cursor:pointer; color:#94a3b8;">👁️</span>
            </div>
          </div>

          <div class="pwd-rules">
            <div style="font-weight:600; margin-bottom:6px;">Tiêu chuẩn bảo mật:</div>
            <div class="pwd-rule-item" id="rule-len">✓ Độ dài tối thiểu 6 ký tự</div>
            <div class="pwd-rule-item" id="rule-char">✓ Chứa cả chữ cái và số</div>
            <div class="pwd-rule-item" id="rule-match">✓ Hai mật khẩu nhập phải trùng khớp</div>
          </div>

          <div style="display:flex; gap:12px; margin-top:24px;">
            <button type="button" class="btn btn-default" id="btn-back-to-profile" style="flex:1; justify-content:center;">
              Quay Lại Hồ Sơ
            </button>
            <button type="submit" class="btn btn-primary" style="flex:1; justify-content:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Xác Nhận Đổi Mật Khẩu
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Eye toggles
  container.querySelectorAll('.toggle-eye').forEach(eye => {
    eye.addEventListener('click', () => {
      const targetId = eye.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Strength check
  const newPwdInput = document.getElementById('chg-pwd-new');
  const confPwdInput = document.getElementById('chg-pwd-confirm');
  const bar = document.getElementById('pwd-strength-indicator');
  const txt = document.getElementById('pwd-strength-text');

  const checkStrength = () => {
    const val = newPwdInput?.value || '';
    const conf = confPwdInput?.value || '';

    // Rule 1: length
    const ruleLen = document.getElementById('rule-len');
    if (ruleLen) ruleLen.classList.toggle('valid', val.length >= 6);

    // Rule 2: char + num
    const hasLetter = /[a-zA-Z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const ruleChar = document.getElementById('rule-char');
    if (ruleChar) ruleChar.classList.toggle('valid', hasLetter && hasNum);

    // Rule 3: match
    const ruleMatch = document.getElementById('rule-match');
    if (ruleMatch) ruleMatch.classList.toggle('valid', val.length > 0 && val === conf);

    if (!val) {
      if (bar) { bar.style.width = '0%'; bar.style.backgroundColor = '#e2e8f0'; }
      if (txt) { txt.textContent = 'Chưa nhập'; txt.style.color = '#64748b'; }
      return;
    }

    if (val.length < 6) {
      if (bar) { bar.style.width = '25%'; bar.style.backgroundColor = '#ef4444'; }
      if (txt) { txt.textContent = 'Yếu (Quá ngắn)'; txt.style.color = '#ef4444'; }
    } else if (hasLetter && hasNum && val.length >= 8) {
      if (bar) { bar.style.width = '100%'; bar.style.backgroundColor = '#10b981'; }
      if (txt) { txt.textContent = 'Rất mạnh (Khuyên dùng)'; txt.style.color = '#10b981'; }
    } else {
      if (bar) { bar.style.width = '60%'; bar.style.backgroundColor = '#f59e0b'; }
      if (txt) { txt.textContent = 'Trung bình'; txt.style.color = '#f59e0b'; }
    }
  };

  newPwdInput?.addEventListener('input', checkStrength);
  confPwdInput?.addEventListener('input', checkStrength);

  document.getElementById('btn-back-to-profile')?.addEventListener('click', () => {
    window.appNavigateTo('profile');
  });

  document.getElementById('page-change-password-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cur = document.getElementById('chg-pwd-current')?.value;
    const pNew = newPwdInput?.value;
    const pConf = confPwdInput?.value;

    if (!cur) {
      toast('Vui lòng nhập mật khẩu hiện tại', 'warning');
      return;
    }
    if (pNew.length < 6) {
      toast('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning');
      return;
    }
    if (pNew !== pConf) {
      toast('Mật khẩu xác nhận không trùng khớp', 'error');
      return;
    }

    toast('Đổi mật khẩu thành công! Mật khẩu mới đã được áp dụng cho tài khoản.', 'success');
    window.appNavigateTo('profile');
  });
}

// ============================================================================
// 3. TRANG CẤU HÌNH, NGƯỜI DÙNG, AUDIT, BACKUP, THÔNG BÁO (SYSTEM PAGES)
// ============================================================================
export function renderSystem(container, subTab = 'settings') {
  if (subTab === 'settings' || subTab === 'system-settings') {
    renderSystemSettingsPage(container);
  } else if (subTab === 'users') {
    renderUsersPage(container);
  } else if (subTab === 'audit-logs') {
    renderAuditLogsPage(container);
  } else if (subTab === 'backup') {
    renderBackupPage(container);
  } else if (subTab === 'system-notifications') {
    renderNotificationsPage(container);
  } else {
    renderSystemSettingsPage(container);
  }
}

// --- SUBPAGE: CẤU HÌNH HỆ THỐNG (SETTINGS) ---
function renderSystemSettingsPage(container) {
  const savedSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem('xnk_system_settings') || '{}');
    } catch { return {}; }
  })();

  const s = {
    companyName: savedSettings.companyName || 'CÔNG TY CP XUẤT NHẬP KHẨU HIỆP LỢI',
    taxCode: savedSettings.taxCode || '0316889922',
    address: savedSettings.address || 'Tầng 12, Tòa nhà Pearl Plaza, 561A Điện Biên Phủ, P. 25, Bình Thạnh, TP.HCM',
    phone: savedSettings.phone || '028 3899 8899',
    email: savedSettings.email || 'contact@hieploigroup.com',
    currency: savedSettings.currency || 'USD',
    exchangeRate: savedSettings.exchangeRate || '25450',
    defaultCustoms: savedSettings.defaultCustoms || '02IK - Chi cục HQ CK Cảng Sài Gòn KV1 (Cát Lái)',
    defaultIncoterm: savedSettings.defaultIncoterm || 'CIF',
    notifyEtaDays: savedSettings.notifyEtaDays || '3',
    autoBackup: savedSettings.autoBackup ?? true
  };

  container.innerHTML = `
    <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <h2 style="font-size:18px; font-weight:700; color:var(--amis-text);">⚙️ Cấu Hình & Thiết Lập Hệ Thống XNK</h2>
          <p style="font-size:13px; color:var(--amis-text-muted); margin-top:2px;">Quản lý tham số doanh nghiệp, tiền tệ, tỷ giá và mặc định nghiệp vụ.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-save-all-settings" style="gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Lưu Cấu Hình
        </button>
      </div>

      <div class="settings-tabs-header">
        <button class="settings-tab-btn active" data-target="pane-company">🏢 Doanh Nghiệp</button>
        <button class="settings-tab-btn" data-target="pane-currency">💵 Tiền Tệ & Tỷ Giá</button>
        <button class="settings-tab-btn" data-target="pane-logistics">🚢 Hải Quan & Vận Tải</button>
        <button class="settings-tab-btn" data-target="pane-notify">🔔 Cảnh Báo & Tự Động Hóa</button>
      </div>

      <form id="settings-form">
        <!-- PANE 1: Company -->
        <div class="settings-pane active" id="pane-company">
          <div class="settings-section-card">
            <div class="settings-section-title">🏢 Thông Tin Pháp Nhân & Doanh Nghiệp</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px 20px;">
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label required">Tên Công Ty (Hiển thị trên Hợp đồng / Báo cáo)</label>
                <input type="text" id="set-company-name" class="form-input" required value="${s.companyName}">
              </div>
              <div class="form-group">
                <label class="form-label required">Mã Số Thuế (MST)</label>
                <input type="text" id="set-tax-code" class="form-input" required value="${s.taxCode}">
              </div>
              <div class="form-group">
                <label class="form-label required">Hotline / Số Điện Thoại</label>
                <input type="text" id="set-phone" class="form-input" required value="${s.phone}">
              </div>
              <div class="form-group" style="grid-column: span 2;">
                <label class="form-label required">Địa Chỉ Trụ Sở Chính</label>
                <input type="text" id="set-address" class="form-input" required value="${s.address}">
              </div>
              <div class="form-group">
                <label class="form-label required">Email Giao Dịch XNK</label>
                <input type="email" id="set-email" class="form-input" required value="${s.email}">
              </div>
            </div>
          </div>
        </div>

        <!-- PANE 2: Currency -->
        <div class="settings-pane" id="pane-currency">
          <div class="settings-section-card">
            <div class="settings-section-title">💵 Tiền Tệ & Tỷ Giá Quy Đổi (USD / VND)</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px 20px;">
              <div class="form-group">
                <label class="form-label required">Đồng Tiền Nghiệp Vụ Mặc Định</label>
                <select id="set-currency" class="form-select">
                  <option value="USD" ${s.currency === 'USD' ? 'selected' : ''}>USD - Đô la Mỹ ($)</option>
                  <option value="VND" ${s.currency === 'VND' ? 'selected' : ''}>VND - Việt Nam Đồng (đ)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">Tỷ Giá Quy Đổi VND / USD (Tỷ giá hạch toán)</label>
                <input type="number" id="set-rate" class="form-input" required value="${s.exchangeRate}">
                <div style="font-size:11.5px; color:#64748b; margin-top:4px;">Áp dụng để tính thuế và quy đổi giá trị lô hàng sang VND.</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PANE 3: Logistics -->
        <div class="settings-pane" id="pane-logistics">
          <div class="settings-section-card">
            <div class="settings-section-title">🚢 Chi Cục Hải Quan & Incoterms Mặc Định</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px 20px;">
              <div class="form-group">
                <label class="form-label required">Chi Cục Hải Quan Mặc Định</label>
                <select id="set-customs" class="form-select">
                  <option value="02IK" selected>02IK - Chi cục HQ CK Cảng Sài Gòn KV1 (Cát Lái)</option>
                  <option value="02CI">02CI - Chi cục HQ CK Cảng Sài Gòn KV3 (Cái Mép)</option>
                  <option value="03EE">03EE - Chi cục HQ CK Cảng Hải Phòng KV1</option>
                  <option value="02B1">02B1 - Chi cục HQ Chuyển phát nhanh TP.HCM</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label required">Điều Kiện Giao Hàng (Incoterm) Mặc Định</label>
                <select id="set-incoterm" class="form-select">
                  <option value="CIF" ${s.defaultIncoterm === 'CIF' ? 'selected' : ''}>CIF - Cost, Insurance and Freight</option>
                  <option value="FOB" ${s.defaultIncoterm === 'FOB' ? 'selected' : ''}>FOB - Free on Board</option>
                  <option value="CFR" ${s.defaultIncoterm === 'CFR' ? 'selected' : ''}>CFR - Cost and Freight</option>
                  <option value="EXW" ${s.defaultIncoterm === 'EXW' ? 'selected' : ''}>EXW - Ex Works</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- PANE 4: Notify -->
        <div class="settings-pane" id="pane-notify">
          <div class="settings-section-card">
            <div class="settings-section-title">🔔 Thiết Lập Cảnh Báo & Tự Động Hóa</div>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px 20px;">
              <div class="form-group">
                <label class="form-label">Thông Báo Trước Ngày Tàu Cập Cảng (ETA)</label>
                <select id="set-notify-eta" class="form-select">
                  <option value="1">Trước 1 ngày</option>
                  <option value="3" selected>Trước 3 ngày (Khuyên dùng)</option>
                  <option value="5">Trước 5 ngày</option>
                  <option value="7">Trước 7 ngày</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tự Động Sao Lưu Cơ Sở Dữ Liệu</label>
                <select id="set-autobackup" class="form-select">
                  <option value="true" selected>Bật (Sao lưu tự động mỗi đêm 00:00)</option>
                  <option value="false">Tắt</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.settings-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-target');
      document.getElementById(target)?.classList.add('active');
    });
  });

  const saveSettings = () => {
    const data = {
      companyName: document.getElementById('set-company-name')?.value?.trim(),
      taxCode: document.getElementById('set-tax-code')?.value?.trim(),
      address: document.getElementById('set-address')?.value?.trim(),
      phone: document.getElementById('set-phone')?.value?.trim(),
      email: document.getElementById('set-email')?.value?.trim(),
      currency: document.getElementById('set-currency')?.value,
      exchangeRate: document.getElementById('set-rate')?.value,
      defaultCustoms: document.getElementById('set-customs')?.value,
      defaultIncoterm: document.getElementById('set-incoterm')?.value,
      notifyEtaDays: document.getElementById('set-notify-eta')?.value,
      autoBackup: document.getElementById('set-autobackup')?.value === 'true'
    };
    localStorage.setItem('xnk_system_settings', JSON.stringify(data));
    toast('Đã lưu cấu hình hệ thống thành công!', 'success');
  };

  document.getElementById('btn-save-all-settings')?.addEventListener('click', saveSettings);
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });
}

// --- SUBPAGE: QUẢN LÝ NGƯỜI DÙNG & PHÂN QUYỀN (USERS) ---
function renderUsersPage(container) {
  const usersList = [
    { id: '1', username: 'admin', fullName: 'Quản Trị Viên Hệ Thống', email: 'admin@xnk-logistics.vn', role: 'Administrator (Toàn quyền)', dept: 'Ban Quản Trị', status: 'Active', lastLogin: 'Hôm nay 18:40' },
    { id: '2', username: 'purchasing', fullName: 'Nguyễn Văn Mua Hàng', email: 'purchasing@xnk-logistics.vn', role: 'Nhân viên Mua Hàng (PO)', dept: 'Phòng Mua Hàng', status: 'Active', lastLogin: 'Hôm qua 16:20' },
    { id: '3', username: 'customs_staff', fullName: 'Trần Hải Quan', email: 'customs@xnk-logistics.vn', role: 'Nhân viên Khai Báo HQ', dept: 'Phòng Logistics', status: 'Active', lastLogin: '20/08/2026' },
    { id: '4', username: 'accountant', fullName: 'Lê Kế Toán', email: 'accounting@xnk-logistics.vn', role: 'Kế Toán Xuất Nhập Khẩu', dept: 'Phòng Tài Chính Kế Toán', status: 'Active', lastLogin: '18/08/2026' },
    { id: '5', username: 'forwarder_lead', fullName: 'Hoàng Forwarder', email: 'shipping@xnk-logistics.vn', role: 'Điều Vận Vận Tải Biển', dept: 'Phòng Logistics', status: 'Inactive', lastLogin: '10/08/2026' }
  ];

  container.innerHTML = `
    <div style="padding: 20px; max-width: 1280px; margin: 0 auto;">
      <div class="amis-toolbar-wrap" style="margin-bottom:16px;">
        <div class="amis-toolbar-left">
          <button id="btn-add-new-user" class="btn btn-primary" style="gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Thêm Người Dùng Mới
          </button>
          <button id="btn-reload-users" class="btn btn-default" style="gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            Nạp Lại
          </button>
        </div>
        <div class="amis-toolbar-right">
          <input type="text" id="user-search-filter" class="form-input" placeholder="Tìm tên, tài khoản, email..." style="width:240px;">
        </div>
      </div>

      <div class="profile-card">
        <div class="grid-scroll">
          <table class="misa-table" id="users-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">#</th>
                <th>Tên Đăng Nhập</th>
                <th>Họ Và Tên</th>
                <th>Email</th>
                <th>Phòng Ban</th>
                <th>Vai Trò (Role)</th>
                <th>Trạng Thái</th>
                <th>Lần Đăng Nhập Cuối</th>
                <th style="text-align:center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${usersList.map((u, i) => `
                <tr>
                  <td style="text-align:center; color:#64748b;">${i + 1}</td>
                  <td><strong style="color:var(--amis-blue); font-family:monospace;">${u.username}</strong></td>
                  <td><strong>${u.fullName}</strong></td>
                  <td>${u.email}</td>
                  <td>${u.dept}</td>
                  <td><span class="status-chip ${u.role.includes('Administrator') ? 'chip-delivered' : 'chip-transit'}">${u.role}</span></td>
                  <td><span class="status-chip ${u.status === 'Active' ? 'chip-delivered' : 'chip-warning'}">${u.status === 'Active' ? 'Đang hoạt động' : 'Đã khóa'}</span></td>
                  <td style="color:#64748b; font-size:12px;">${u.lastLogin}</td>
                  <td style="text-align:center;">
                    <button class="btn btn-default btn-sm" onclick="window.editUserRole('${u.id}', '${u.username}')" title="Phân quyền">⚙️ Sửa</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-add-new-user')?.addEventListener('click', () => {
    openAddNewUserModal();
  });

  window.editUserRole = (id, username) => {
    toast(`Mở phân quyền cho tài khoản @${username}`, 'info');
  };
}

function openAddNewUserModal() {
  const content = `
    <form id="form-create-user" style="padding:4px 0;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px 16px;">
        <div class="form-group">
          <label class="form-label required">Tên Đăng Nhập</label>
          <input type="text" class="form-input" required placeholder="VD: logistics_nv1">
        </div>
        <div class="form-group">
          <label class="form-label required">Mật Khẩu Mặc Định</label>
          <input type="password" class="form-input" required value="123456">
        </div>
        <div class="form-group" style="grid-column: span 2;">
          <label class="form-label required">Họ và Tên</label>
          <input type="text" class="form-input" required placeholder="VD: Nguyễn Văn A">
        </div>
        <div class="form-group">
          <label class="form-label required">Email</label>
          <input type="email" class="form-input" required placeholder="nhanvien@xnk-logistics.vn">
        </div>
        <div class="form-group">
          <label class="form-label">Vai Trò (Role)</label>
          <select class="form-select">
            <option value="Staff">Nhân viên Xuất Nhập Khẩu</option>
            <option value="Purchasing">Nhân viên Mua Hàng (PO)</option>
            <option value="Customs">Khai Báo Hải Quan</option>
            <option value="Accounting">Kế Toán XNK</option>
            <option value="Admin">Administrator (Quản trị)</option>
          </select>
        </div>
      </div>
    </form>
  `;

  const footer = `
    <button type="button" class="btn btn-default" onclick="closeModal()">Hủy</button>
    <button type="submit" form="form-create-user" class="btn btn-primary">Tạo Tài Khoản</button>
  `;

  openModal('Thêm Người Dùng Mới', content, footer);
  document.getElementById('form-create-user')?.addEventListener('submit', (e) => {
    e.preventDefault();
    closeModal();
    toast('Tạo tài khoản mới thành công!', 'success');
  });
}

// --- SUBPAGE: NHẬT KÝ HỆ THỐNG (AUDIT LOGS) ---
function renderAuditLogsPage(container) {
  const logs = [
    { time: '15/10/2026 16:10', user: 'admin', action: 'STATUS_CHANGE', entity: 'Lô hàng SHP-20261014-155', ip: '192.168.1.45', detail: 'Đổi trạng thái sang [Đã hoàn thành]' },
    { time: '15/10/2026 15:45', user: 'admin', action: 'CREATE', entity: 'Invoice INV-20261015-01', ip: '192.168.1.45', detail: 'Lập hóa đơn mới cho lô hàng nhập khẩu Sợi Polyester' },
    { time: '15/10/2026 14:20', user: 'purchasing', action: 'CREATE', entity: 'Lô hàng SHP-20261015-888', ip: '192.168.1.88', detail: 'Tạo lô hàng nhập khẩu từ Formosa Chemicals' },
    { time: '15/10/2026 11:05', user: 'customs_staff', action: 'UPDATE', entity: 'Tờ khai HQ 105492817290', ip: '192.168.1.52', detail: 'Cập nhật phân luồng: Luồng Xanh (Thông quan)' },
    { time: '15/10/2026 09:30', user: 'admin', action: 'LOGIN', entity: 'Hệ Thống', ip: '192.168.1.45', detail: 'Đăng nhập thành công từ Chrome trên Windows' },
    { time: '14/10/2026 17:15', user: 'accountant', action: 'UPDATE', entity: 'Hợp đồng SC-2026-092', ip: '192.168.1.66', detail: 'Cập nhật thanh toán đợt 1 (30% TT)' },
    { time: '14/10/2026 14:00', user: 'admin', action: 'BACKUP', entity: 'PostgreSQL DB', ip: '127.0.0.1', detail: 'Sao lưu tự động cơ sở dữ liệu định kỳ' }
  ];

  container.innerHTML = `
    <div style="padding: 20px; max-width: 1280px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
          <h2 style="font-size:18px; font-weight:700; color:var(--amis-text);">📋 Nhật Ký Hoạt Động Hệ Thống (Audit Logs)</h2>
          <p style="font-size:13px; color:var(--amis-text-muted); margin-top:2px;">Ghi nhận lịch sử thao tác, đăng nhập và thay đổi dữ liệu theo chuẩn bảo mật ISO.</p>
        </div>
        <button type="button" class="btn btn-default" id="btn-export-audit" style="gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Xuất File Excel (Audit Log)
        </button>
      </div>

      <div class="profile-card">
        <div class="grid-scroll">
          <table class="misa-table">
            <thead>
              <tr>
                <th style="width:150px;">Thời Gian</th>
                <th style="width:110px;">Người Dùng</th>
                <th style="width:130px;">Hành Động</th>
                <th style="width:200px;">Đối Tượng</th>
                <th>Chi Tiết Thao Tác</th>
                <th style="width:120px;">Địa Chỉ IP</th>
              </tr>
            </thead>
            <tbody>
              ${logs.map(l => {
                let chipClass = 'audit-chip-update';
                let chipText = 'CẬP NHẬT';
                if (l.action === 'CREATE') { chipClass = 'audit-chip-create'; chipText = 'TẠO MỚI'; }
                else if (l.action === 'STATUS_CHANGE') { chipClass = 'audit-chip-status'; chipText = 'ĐỔI TRẠNG THÁI'; }
                else if (l.action === 'LOGIN') { chipClass = 'audit-chip-create'; chipText = 'ĐĂNG NHẬP'; }
                else if (l.action === 'BACKUP') { chipClass = 'audit-chip-update'; chipText = 'SAO LƯU'; }

                return `
                  <tr>
                    <td style="color:#64748b; font-size:12px; font-family:monospace;">${l.time}</td>
                    <td><strong style="color:var(--amis-blue);">@${l.user}</strong></td>
                    <td><span class="${chipClass}">${chipText}</span></td>
                    <td><strong>${l.entity}</strong></td>
                    <td>${l.detail}</td>
                    <td style="color:#64748b; font-family:monospace; font-size:11.5px;">${l.ip}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-export-audit')?.addEventListener('click', () => {
    toast('Đang xuất nhật ký hệ thống ra Excel...', 'info');
  });
}

// --- SUBPAGE: SAO LƯU DỮ LIỆU POSTGRESQL (BACKUP) ---
function renderBackupPage(container) {
  const backups = [
    { name: 'backup_xnk_20261015_000001.sql.gz', size: '14.8 MB', date: '15/10/2026 00:00', type: 'Tự động (Daily)', status: 'Success' },
    { name: 'backup_xnk_20261014_000001.sql.gz', size: '14.6 MB', date: '14/10/2026 00:00', type: 'Tự động (Daily)', status: 'Success' },
    { name: 'backup_xnk_20261013_153022.sql.gz', size: '14.2 MB', date: '13/10/2026 15:30', type: 'Thủ công (Manual)', status: 'Success' },
    { name: 'backup_xnk_20261013_000001.sql.gz', size: '14.1 MB', date: '13/10/2026 00:00', type: 'Tự động (Daily)', status: 'Success' }
  ];

  container.innerHTML = `
    <div style="padding: 20px; max-width: 1280px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <h2 style="font-size:18px; font-weight:700; color:var(--amis-text);">💾 Sao Lưu & Khôi Phục Dữ Liệu PostgreSQL</h2>
          <p style="font-size:13px; color:var(--amis-text-muted); margin-top:2px;">Quản lý an toàn dữ liệu cơ sở dữ liệu xnk_postgres và lịch trình pg_dump.</p>
        </div>
        <button type="button" class="btn btn-primary" id="btn-trigger-backup-now" style="gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Tạo Bản Sao Lưu Ngay (pg_dump)
        </button>
      </div>

      <!-- Health Boxes -->
      <div class="backup-health-grid">
        <div class="backup-health-box">
          <div class="backup-health-icon">🐘</div>
          <div class="backup-health-meta">
            <div class="label">Hệ Quản Trị CSDL</div>
            <div class="val">PostgreSQL 16</div>
          </div>
        </div>
        <div class="backup-health-box">
          <div class="backup-health-icon">🗄️</div>
          <div class="backup-health-meta">
            <div class="label">Tên Database</div>
            <div class="val" style="color:var(--amis-blue); font-family:monospace;">xnk_postgres</div>
          </div>
        </div>
        <div class="backup-health-box">
          <div class="backup-health-icon">📊</div>
          <div class="backup-health-meta">
            <div class="label">Dung Lượng Data</div>
            <div class="val">48.6 MB</div>
          </div>
        </div>
        <div class="backup-health-box">
          <div class="backup-health-icon" style="color:var(--amis-green); background:var(--amis-green-light);">🟢</div>
          <div class="backup-health-meta">
            <div class="label">Trạng Thái Kết Nối</div>
            <div class="val" style="color:var(--amis-green);">Đang Hoạt Động</div>
          </div>
        </div>
      </div>

      <!-- Backup Files Table -->
      <div class="profile-card">
        <div class="profile-card-header">
          <div class="profile-card-title">
            📦 Danh Sách Bản Sao Lưu (.sql.gz)
          </div>
          <span style="font-size:12px; color:var(--amis-text-muted);">Lưu trữ tối đa 30 ngày</span>
        </div>
        <div class="grid-scroll">
          <table class="misa-table">
            <thead>
              <tr>
                <th>Tên Bản Sao Lưu (File Name)</th>
                <th>Dung Lượng</th>
                <th>Thời Điểm Tạo</th>
                <th>Loại Sao Lưu</th>
                <th>Trạng Thái</th>
                <th style="text-align:center;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${backups.map(b => `
                <tr>
                  <td><strong style="font-family:monospace; color:var(--amis-blue);">${b.name}</strong></td>
                  <td style="font-weight:600;">${b.size}</td>
                  <td style="color:#64748b; font-size:12.5px;">${b.date}</td>
                  <td><span class="status-chip chip-transit">${b.type}</span></td>
                  <td><span class="status-chip chip-delivered">Hoàn tất</span></td>
                  <td style="text-align:center; white-space:nowrap;">
                    <button class="btn btn-default btn-sm" onclick="window.downloadBackupFile('${b.name}')" title="Tải file về máy">⬇️ Tải về</button>
                    <button class="btn btn-default btn-sm" style="color:var(--amis-red);" onclick="window.restoreBackupFile('${b.name}')" title="Khôi phục CSDL">🔄 Khôi phục</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-trigger-backup-now')?.addEventListener('click', () => {
    toast('Đang khởi chạy tiến trình pg_dump sao lưu database...', 'info');
    setTimeout(() => {
      toast('Tạo bản sao lưu PostgreSQL thành công: backup_xnk_manual.sql.gz', 'success');
    }, 1200);
  });

  window.downloadBackupFile = (name) => {
    toast(`Bắt đầu tải file sao lưu: ${name}`, 'info');
  };

  window.restoreBackupFile = async (name) => {
    const ok = await showConfirm({
      title: 'Khôi Phục Cơ Sở Dữ Liệu',
      message: `CẢNH BÁO: Hành động này sẽ khôi phục toàn bộ database về thời điểm bản sao lưu ${name}. Dữ liệu hiện tại có thể bị ghi đè!`,
      type: 'danger',
      confirmText: 'Tôi hiểu, khôi phục ngay',
      cancelText: 'Hủy bỏ'
    });
    if (ok) {
      toast('Đang thực hiện khôi phục dữ liệu từ bản sao lưu...', 'info');
      setTimeout(() => toast('Khôi phục cơ sở dữ liệu thành công!', 'success'), 1500);
    }
  };
}

// --- SUBPAGE: THÔNG BÁO TỰ ĐỘNG (NOTIFICATIONS) ---
function renderNotificationsPage(container) {
  const notifs = [
    { id: 1, title: 'Lô hàng SHP-20260806-LCW dự kiến cập cảng (ETA) sau 2 ngày', type: 'shipment', time: '10 phút trước', read: false },
    { id: 2, title: 'Tờ khai HQ 105492817290 đã được duyệt thông quan (Luồng Xanh)', type: 'customs', time: '1 giờ trước', read: false },
    { id: 3, title: 'Hóa đơn INV-2026-004 đã đến hạn thanh toán đợt 2 (70%)', type: 'invoice', time: 'Hôm nay 09:30', read: true },
    { id: 4, title: 'Bản sao lưu cơ sở dữ liệu đêm qua đã hoàn thành (14.8 MB)', type: 'system', time: 'Hôm nay 00:01', read: true },
    { id: 5, title: 'Vận đơn COSU63289104 đã cập nhật tình trạng Telex Surrender', type: 'shipment', time: 'Hôm qua 15:40', read: true }
  ];

  container.innerHTML = `
    <div style="padding: 20px; max-width: 960px; margin: 0 auto;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <div>
          <h2 style="font-size:18px; font-weight:700; color:var(--amis-text);">🔔 Trung Tâm Thông Báo Tự Động</h2>
          <p style="font-size:13px; color:var(--amis-text-muted); margin-top:2px;">Cập nhật theo thời gian thực về tiến độ lô hàng, thông quan và cảnh báo hạn thanh toán.</p>
        </div>
        <button type="button" class="btn btn-default" id="btn-mark-all-read" style="gap:6px;">
          ✓ Đánh Dấu Tất Cả Đã Đọc
        </button>
      </div>

      <div class="profile-card">
        <div style="padding: 8px 12px; border-bottom: 1px solid var(--border-color); display:flex; gap:8px;">
          <button class="btn btn-primary btn-sm">Tất cả (5)</button>
          <button class="btn btn-default btn-sm">Chưa đọc (2)</button>
        </div>
        <div style="padding: 6px;">
          ${notifs.map(n => `
            <div style="display:flex; align-items:center; gap:14px; padding:12px 14px; border-radius:var(--radius-md); margin:4px 0; background:${n.read ? 'transparent' : 'var(--amis-blue-light)'}; cursor:pointer; transition:all 0.15s ease;"
              onclick="window.appNavigateTo('shipments')">
              <div style="font-size:20px;">${n.type === 'shipment' ? '🚢' : n.type === 'customs' ? '📋' : n.type === 'invoice' ? '🧾' : '⚙️'}</div>
              <div style="flex:1;">
                <div style="font-size:13.5px; font-weight:${n.read ? '500' : '700'}; color:var(--amis-text);">${n.title}</div>
                <div style="font-size:11.5px; color:var(--amis-text-muted); margin-top:2px;">${n.time}</div>
              </div>
              ${!n.read ? '<span style="width:8px; height:8px; border-radius:50%; background:var(--amis-blue); flex-shrink:0;"></span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-mark-all-read')?.addEventListener('click', () => {
    toast('Đã đánh dấu tất cả thông báo là đã đọc', 'success');
    renderNotificationsPage(container);
  });
}
