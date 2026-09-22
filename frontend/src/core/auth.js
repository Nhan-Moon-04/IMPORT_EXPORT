/**
 * Authentication management
 */
import { api, setToken, getToken, showToast } from "./api.js";

export async function login(username, password) {
  const res = await api.post("/api/auth/login", { username, password });
  if (res.success && res.data && res.data.accessToken) {
    setToken(res.data.accessToken);
    localStorage.setItem("xnk_user", JSON.stringify(res.data.user));
    showToast("Đăng nhập thành công!", "success");
    return res.data;
  }
}

export function logout() {
  setToken(null);
  localStorage.removeItem("xnk_user");
  window.location.reload();
}

export function getUser() {
  const str = localStorage.getItem("xnk_user");
  return str ? JSON.parse(str) : null;
}

export function isAuthenticated() {
  return !!getToken();
}
