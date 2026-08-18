import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const api = axios.create({
  baseURL: "/v1",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      const auth = useAuthStore.getState();
      if (!auth.refreshToken) {
        auth.logout();
        return Promise.reject(error);
      }
      try {
        const res = await axios.post("/v1/auth/refresh", { refreshToken: auth.refreshToken });
        auth.setTokens(res.data.accessToken, res.data.refreshToken ?? auth.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        auth.logout();
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);
