import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as settlementService from "../../services/settlementService";

export const fetchCalculatedSettlements = createAsyncThunk("settlements/fetchCalculated", async (groupId, { rejectWithValue }) => {
  try {
    const data = await settlementService.getCalculatedSettlements(groupId);
    return data.settlements || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const recordSettlement = createAsyncThunk("settlements/record", async (payload, { rejectWithValue }) => {
  try {
    const data = await settlementService.recordSettlement(payload);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchGroupSettlements = createAsyncThunk("settlements/fetchHistory", async (groupId, { rejectWithValue }) => {
  try {
    const data = await settlementService.getGroupSettlements(groupId);
    return data.settlements || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const settlementSlice = createSlice({
  name: "settlements",
  initialState: {
    calculated: [],
    history: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSettlementError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchCalculatedSettlements
      .addCase(fetchCalculatedSettlements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalculatedSettlements.fulfilled, (state, action) => {
        state.calculated = action.payload;
        state.loading = false;
      })
      .addCase(fetchCalculatedSettlements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // recordSettlement
      .addCase(recordSettlement.rejected, (state, action) => {
        state.error = action.payload;
      })
      // fetchGroupSettlements
      .addCase(fetchGroupSettlements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupSettlements.fulfilled, (state, action) => {
        state.history = action.payload;
        state.loading = false;
      })
      .addCase(fetchGroupSettlements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSettlementError } = settlementSlice.actions;
export default settlementSlice.reducer;
