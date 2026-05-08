import axiosInstance from "./axiosInstance";

export function loginUser(email, password) {
  return axiosInstance.post("/auth/login", { email, password }).then((res) => res.data);
}

export function registerUser({ username, email, password }) {
  return axiosInstance.post("/auth/register", { username, email, password }).then((res) => res.data);
}

export function getMe() {
  return axiosInstance.get("/auth/me").then((res) => res.data);
}
