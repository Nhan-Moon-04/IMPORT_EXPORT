// frontend/src/features/excel/excel.js
import { api, toast, openModal, closeModal } from '../../core/api.js';

let parsedData = [];
let sheetNames = [];
let currentWorkbook = null;

export function renderExcelTool(container) {
  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <h3 style="font-size:16px; font-weight:700; color:var(--amis-blue); margin-bottom:12px;">
        Công Cụ Đọc & Nhập Dữ Liệu Excel / Hợp Đồng / Packing List (SheetJS)
      </h3>
      <p style="font-size:13px; color:#6b7280; margin-bottom:16px;">
        Hỗ trợ đọc các file Excel thông dụng trong ngành sợi XNK (như bảng kê <code>LONG CHENG WU.xlsx</code>, <code>POY-DTY.xlsx</code>, đơn hàng đối tác).
      </p>

      <div class="dropzone" id="excel-dropzone">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0266b3" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <div style="font-weight:600; font-size:14px; margin-top:8px;">Kéo thả file Excel (.xlsx, .xls, .csv) vào đây hoặc bấm để chọn</div>
        <div style="font-size:12px; color:#6b7280; margin-top:4px;">Tự động phân tích cấu trúc cột, số lượng kiện, trọng lượng NW/GW</div>
        <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" style="display:none;">
      </div>
    </div>

    <div class="card" id="excel-preview-card" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-weight:600; font-size:13px;">Chọn Sheet:</span>
          <select id="excel-sheet-select" class="form-control" style="width:200px;"></select>
          <span id="excel-row-count" style="font-size:12px; color:#6b7280;"></span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" id="btn-import-to-products">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Nhập Vào Danh Mục Sợi
          </button>
          <button class="btn btn-secondary" id="btn-export-json">Xuất JSON</button>
        </div>
      </div>

      <div class="table-container" style="max-height: 480px; overflow-x: auto;">
        <table class="data-table" id="excel-table">
          <thead id="excel-table-head"></thead>
          <tbody id="excel-table-body"></tbody>
        </table>
      </div>
    </div>
  `;

  const dropzone = document.getElementById('excel-dropzone');
  const fileInput = document.getElementById('excel-file-input');

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleExcelFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleExcelFile(e.dataTransfer.files[0]);
  });

  document.getElementById('excel-sheet-select').addEventListener('change', (e) => {
    renderSelectedSheet(e.target.value);
  });

  document.getElementById('btn-import-to-products').addEventListener('click', importProductsFromExcel);
  document.getElementById('btn-export-json').addEventListener('click', exportParsedJson);
}

function handleExcelFile(file) {
  if (typeof XLSX === 'undefined') {
    toast('Đang tải thư viện xử lý Excel...', 'info');
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => parseWorkbook(file);
    script.onerror = () => toast('Không tải được thư viện SheetJS', 'error');
    document.head.appendChild(script);
  } else {
    parseWorkbook(file);
  }
}

function parseWorkbook(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      currentWorkbook = XLSX.read(data, { type: 'array' });
      sheetNames = currentWorkbook.SheetNames;

      const sheetSelect = document.getElementById('excel-sheet-select');
      sheetSelect.innerHTML = sheetNames.map(name => `<option value="${name}">${name}</option>`).join('');

      document.getElementById('excel-preview-card').style.display = 'block';
      renderSelectedSheet(sheetNames[0]);
      toast(`Đã đọc thành công file ${file.name} (${sheetNames.length} sheet)`, 'success');
    } catch (err) {
      toast(`Lỗi đọc file Excel: ${err.message}`, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function renderSelectedSheet(sheetName) {
  if (!currentWorkbook) return;
  const worksheet = currentWorkbook.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (json.length === 0) {
    document.getElementById('excel-table-head').innerHTML = '';
    document.getElementById('excel-table-body').innerHTML = '<tr><td style="padding:20px; text-align:center;">Sheet trống</td></tr>';
    return;
  }

  const headerRow = json[0];
  const rows = json.slice(1);
  parsedData = rows;

  document.getElementById('excel-row-count').textContent = `(${rows.length} dòng dữ liệu)`;

  // Render headers
  document.getElementById('excel-table-head').innerHTML = `
    <tr>
      <th style="width:40px; text-align:center;">#</th>
      ${headerRow.map(h => `<th>${h || ''}</th>`).join('')}
    </tr>
  `;

  // Render rows
  document.getElementById('excel-table-body').innerHTML = rows.map((r, idx) => `
    <tr>
      <td style="text-align:center; font-weight:600; color:#6b7280;">${idx + 1}</td>
      ${headerRow.map((_, colIdx) => `<td>${r[colIdx] !== undefined ? r[colIdx] : ''}</td>`).join('')}
    </tr>
  `).join('');
}

async function importProductsFromExcel() {
  if (!parsedData || parsedData.length === 0) {
    toast('Chưa có dữ liệu để nhập!', 'warning');
    return;
  }

  let successCount = 0;
  for (const row of parsedData) {
    if (!row || !row[0]) continue;
    // Map basic yarn columns (code, name, denier, filament, luster)
    const code = String(row[0]).trim();
    const name = row[1] ? String(row[1]).trim() : code;
    const yarnType = row[2] ? String(row[2]).trim() : 'DTY';
    const denier = parseFloat(row[3]) || 150;
    const filament = parseInt(row[4], 10) || 48;
    const luster = row[5] ? String(row[5]).trim() : 'Semi-Dull';

    try {
      await api.post('/api/products', {
        code: code,
        name: name,
        yarnType: yarnType,
        denier: denier,
        filament: filament,
        luster: luster,
        unit: 'KG',
        standardPrice: 2.50
      });
      successCount++;
    } catch {
      // Continue next rows
    }
  }

  toast(`Đã nhập thành công ${successCount} sản phẩm sợi vào hệ thống!`, 'success');
}

function exportParsedJson() {
  if (!parsedData || parsedData.length === 0) {
    toast('Không có dữ liệu để xuất', 'warning');
    return;
  }
  const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `excel-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Đã xuất file JSON thành công!', 'success');
}
