import { api } from "./axiosClient";

export const getUserProfile = async () => {
  const res = await api.get("/user/profile");
  return res.data;
};

export const updateUserProfile = async (data: any) => {
  const res = await api.put("/user/profile", data);
  return res.data;
};
