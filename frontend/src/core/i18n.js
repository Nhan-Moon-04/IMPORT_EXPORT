/**
 * Multi-language dictionary
 */
export const dictionaries = {
  vi: {
    dashboard: "Tổng quan",
    products: "Hàng hóa & Sợi dệt",
    shipments: "Lô hàng XNK",
    orders: "Đơn mua hàng (PO)",
    invoices: "Hóa đơn thương mại",
    documents: "Quản lý Chứng từ & File",
    suppliers: "Nhà cung cấp",
    customers: "Khách hàng",
    excelImport: "Nhập dữ liệu Excel",
    btnAdd: "+ Thêm mới",
    btnEdit: "Sửa",
    btnDelete: "Xóa",
    btnRefresh: "Nạp lại",
    btnExport: "Xuất khẩu",
    btnImport: "Nhập từ Excel",
    searchPlaceholder: "Tìm kiếm...",
    totalRecords: "Tổng số:",
    records: "bản ghi"
  },
  en: {
    dashboard: "Dashboard",
    products: "Products & Yarn",
    shipments: "Shipments",
    orders: "Purchase Orders",
    invoices: "Commercial Invoices",
    documents: "Document Center",
    suppliers: "Suppliers",
    customers: "Customers",
    excelImport: "Excel Import",
    btnAdd: "+ Add New",
    btnEdit: "Edit",
    btnDelete: "Delete",
    btnRefresh: "Refresh",
    btnExport: "Export",
    btnImport: "Import",
    searchPlaceholder: "Search...",
    totalRecords: "Total:",
    records: "records"
  },
  zh: {
    dashboard: "仪表盘",
    products: "纱线与产品",
    shipments: "货运批次",
    orders: "采购订单",
    invoices: "商业发票",
    documents: "单据管理",
    suppliers: "供应商",
    customers: "客户",
    excelImport: "Excel 导入",
    btnAdd: "+ 新增",
    btnEdit: "修改",
    btnDelete: "删除",
    btnRefresh: "刷新",
    btnExport: "导出",
    btnImport: "导入",
    searchPlaceholder: "搜索...",
    totalRecords: "总计:",
    records: "条记录"
  }
};

let currentLang = localStorage.getItem("xnk_lang") || "vi";

export function t(key) {
  return dictionaries[currentLang]?.[key] || key;
}

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("xnk_lang", lang);
}

export function getLanguage() {
  return currentLang;
}
