import axiosInstance from "./axiosInstance";

export function searchUsers(query) {
  return axiosInstance.get(`/users/search?q=${encodeURIComponent(query)}`).then((res) => res.data);
}
