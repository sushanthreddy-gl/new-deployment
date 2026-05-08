import axiosInstance from "./axiosInstance";

export function getGroups() {
  return axiosInstance.get("/groups").then((res) => res.data);
}

export function getGroup(id) {
  return axiosInstance.get(`/groups/${id}`).then((res) => res.data);
}

export function createGroup({ name, memberIds }) {
  return axiosInstance.post("/groups", { name, memberIds }).then((res) => res.data);
}

export function updateGroup(id, { name, addMemberIds }) {
  return axiosInstance.put(`/groups/${id}`, { name, addMemberIds }).then((res) => res.data);
}

export function deleteGroup(id) {
  return axiosInstance.delete(`/groups/${id}`).then((res) => res.data);
}
