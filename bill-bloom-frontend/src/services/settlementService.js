import axiosInstance from "./axiosInstance";

export function getCalculatedSettlements(groupId) {
  return axiosInstance.get(`/settlements/settleGroup/${groupId}`).then((res) => res.data);
}

export function recordSettlement({ fromId, toId, amount, groupId }) {
  return axiosInstance.post("/settlements", { fromId, toId, amount, groupId }).then((res) => res.data);
}

export function getGroupSettlements(groupId) {
  return axiosInstance.get(`/settlements/group/${groupId}`).then((res) => res.data);
}
