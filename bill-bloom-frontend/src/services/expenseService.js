import axiosInstance from "./axiosInstance";

export function getPersonalExpenses() {
  return axiosInstance.get("/expenses/personal").then((res) => res.data);
}

export function getGroupExpenses(groupId) {
  return axiosInstance.get(`/expenses/group/${groupId}`).then((res) => res.data);
}

export function createExpense(data) {
  return axiosInstance.post("/expenses", data).then((res) => res.data);
}

export function deleteExpense(id) {
  return axiosInstance.delete(`/expenses/${id}`).then((res) => res.data);
}
