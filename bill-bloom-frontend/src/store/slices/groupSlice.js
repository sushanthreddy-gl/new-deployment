import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as groupService from "../../services/groupService";

export const fetchGroups = createAsyncThunk("groups/fetchGroups", async (_, { rejectWithValue }) => {
  try {
    const data = await groupService.getGroups();
    return data.groups || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchGroupById = createAsyncThunk("groups/fetchGroupById", async (id, { rejectWithValue }) => {
  try {
    const data = await groupService.getGroup(id);
    return data.group;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const createGroup = createAsyncThunk("groups/createGroup", async (payload, { rejectWithValue }) => {
  try {
    const data = await groupService.createGroup(payload);
    return data.group;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const updateGroup = createAsyncThunk("groups/updateGroup", async ({ id, data: payload }, { rejectWithValue }) => {
  try {
    const data = await groupService.updateGroup(id, payload);
    return data.group;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const deleteGroup = createAsyncThunk("groups/deleteGroup", async (id, { rejectWithValue }) => {
  try {
    await groupService.deleteGroup(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const groupSlice = createSlice({
  name: "groups",
  initialState: {
    groups: [],
    currentGroup: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearGroupError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchGroups
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.groups = action.payload;
        state.loading = false;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchGroupById
      .addCase(fetchGroupById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupById.fulfilled, (state, action) => {
        state.currentGroup = action.payload;
        state.loading = false;
      })
      .addCase(fetchGroupById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createGroup
      .addCase(createGroup.fulfilled, (state, action) => {
        state.groups.push(action.payload);
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      // updateGroup
      .addCase(updateGroup.fulfilled, (state, action) => {
        const idx = state.groups.findIndex((g) => g._id === action.payload._id);
        if (idx !== -1) state.groups[idx] = action.payload;
        if (state.currentGroup?._id === action.payload._id) {
          state.currentGroup = action.payload;
        }
      })
      .addCase(updateGroup.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deleteGroup
      .addCase(deleteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter((g) => g._id !== action.payload);
        if (state.currentGroup?._id === action.payload) {
          state.currentGroup = null;
        }
      })
      .addCase(deleteGroup.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearGroupError } = groupSlice.actions;
export default groupSlice.reducer;
