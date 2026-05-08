import * as userService from '../services/usersService.js';

export const search = async (req, res) => {
    try {
        const query = req.query.q || "";
        const users = await userService.searchUsers(query);
        res.json({ users });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ message: "Failed to search users" });
    }
};