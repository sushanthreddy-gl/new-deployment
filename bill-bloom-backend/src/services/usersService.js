import User from "../models/User.js";

export const searchUsers = async (query) => {
    if (!query.trim()) return [];

    const users = await User.find({
        username: { $regex: query, $options: "i" }
    }).select("_id username email avatarUrl");

    return users;
}
