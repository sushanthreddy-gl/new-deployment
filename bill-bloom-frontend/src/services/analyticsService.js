import axiosInstance from "./axiosInstance";

export function getMonthlyPersonal() {
  return axiosInstance.get("/analytics/personal").then((res) => res.data);
}

export function getGroupSpending() {
  return axiosInstance.get("/analytics/groups").then((res) => res.data);
}

export function getGroupCategories(groupId) {
  return axiosInstance.get(`/analytics/group/${groupId}/categories`).then((res) => res.data);
}

export function getPersonalCategories() {
  return axiosInstance.get("/analytics/personal/categories").then((res) => res.data);
}
