import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as analyticsService from "../../services/analyticsService";

export const fetchMonthlyPersonal = createAsyncThunk("analytics/fetchMonthly", async (_, { rejectWithValue }) => {
  try {
    const data = await analyticsService.getMonthlyPersonal();
    return data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchGroupSpending = createAsyncThunk("analytics/fetchGroupSpending", async (_, { rejectWithValue }) => {
  try {
    const data = await analyticsService.getGroupSpending();
    return data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchGroupCategories = createAsyncThunk("analytics/fetchGroupCategories", async (groupId, { rejectWithValue }) => {
  try {
    const data = await analyticsService.getGroupCategories(groupId);
    return data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchPersonalCategories = createAsyncThunk("analytics/fetchPersonalCategories", async (_, { rejectWithValue }) => {
  try {
    const data = await analyticsService.getPersonalCategories();
    return data.data || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const analyticsSlice = createSlice({
  name: "analytics",
  initialState: {
    monthlyPersonal: [],
    groupSpending: [],
    personalCategories: [],
    groupCategories: [],
    loading: {
      monthly: false,
      groupSpend: false,
      personalCat: false,
      groupCat: false,
    },
    error: {
      monthly: "",
      groupSpend: "",
      personalCat: "",
      groupCat: "",
    },
  },
  reducers: {
    clearAnalyticsError(state) {
      state.error = { monthly: "", groupSpend: "", personalCat: "", groupCat: "" };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchMonthlyPersonal
      .addCase(fetchMonthlyPersonal.pending, (state) => {
        state.loading.monthly = true;
        state.error.monthly = "";
      })
      .addCase(fetchMonthlyPersonal.fulfilled, (state, action) => {
        state.monthlyPersonal = action.payload;
        state.loading.monthly = false;
      })
      .addCase(fetchMonthlyPersonal.rejected, (state, action) => {
        state.loading.monthly = false;
        state.error.monthly = action.payload;
      })
      // fetchGroupSpending
      .addCase(fetchGroupSpending.pending, (state) => {
        state.loading.groupSpend = true;
        state.error.groupSpend = "";
      })
      .addCase(fetchGroupSpending.fulfilled, (state, action) => {
        state.groupSpending = action.payload;
        state.loading.groupSpend = false;
      })
      .addCase(fetchGroupSpending.rejected, (state, action) => {
        state.loading.groupSpend = false;
        state.error.groupSpend = action.payload;
      })
      // fetchGroupCategories
      .addCase(fetchGroupCategories.pending, (state) => {
        state.loading.groupCat = true;
        state.error.groupCat = "";
      })
      .addCase(fetchGroupCategories.fulfilled, (state, action) => {
        state.groupCategories = action.payload;
        state.loading.groupCat = false;
      })
      .addCase(fetchGroupCategories.rejected, (state, action) => {
        state.loading.groupCat = false;
        state.error.groupCat = action.payload;
      })
      // fetchPersonalCategories
      .addCase(fetchPersonalCategories.pending, (state) => {
        state.loading.personalCat = true;
        state.error.personalCat = "";
      })
      .addCase(fetchPersonalCategories.fulfilled, (state, action) => {
        state.personalCategories = action.payload;
        state.loading.personalCat = false;
      })
      .addCase(fetchPersonalCategories.rejected, (state, action) => {
        state.loading.personalCat = false;
        state.error.personalCat = action.payload;
      });
  },
});

export const { clearAnalyticsError } = analyticsSlice.actions;
export default analyticsSlice.reducer;
