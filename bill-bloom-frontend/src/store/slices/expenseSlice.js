import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import * as expenseService from "../../services/expenseService";

export const fetchPersonalExpenses = createAsyncThunk("expenses/fetchPersonal", async (_, { rejectWithValue }) => {
  try {
    const data = await expenseService.getPersonalExpenses();
    return data.expenses || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const fetchGroupExpenses = createAsyncThunk("expenses/fetchGroup", async (groupId, { rejectWithValue }) => {
  try {
    const data = await expenseService.getGroupExpenses(groupId);
    return data.expenses || [];
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const createExpense = createAsyncThunk("expenses/create", async (expenseData, { rejectWithValue }) => {
  try {
    const data = await expenseService.createExpense(expenseData);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

export const deleteExpense = createAsyncThunk("expenses/delete", async (id, { rejectWithValue }) => {
  try {
    await expenseService.deleteExpense(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || err.message);
  }
});

const expenseSlice = createSlice({
  name: "expenses",
  initialState: {
    personalExpenses: [],
    groupExpenses: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearExpenseError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPersonalExpenses
      .addCase(fetchPersonalExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPersonalExpenses.fulfilled, (state, action) => {
        state.personalExpenses = action.payload;
        state.loading = false;
      })
      .addCase(fetchPersonalExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // fetchGroupExpenses
      .addCase(fetchGroupExpenses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupExpenses.fulfilled, (state, action) => {
        state.groupExpenses = action.payload;
        state.loading = false;
      })
      .addCase(fetchGroupExpenses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createExpense
      .addCase(createExpense.rejected, (state, action) => {
        state.error = action.payload;
      })
      // deleteExpense
      .addCase(deleteExpense.fulfilled, (state, action) => {
        state.personalExpenses = state.personalExpenses.filter((e) => e._id !== action.payload);
        state.groupExpenses = state.groupExpenses.filter((e) => e._id !== action.payload);
      })
      .addCase(deleteExpense.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearExpenseError } = expenseSlice.actions;
export default expenseSlice.reducer;
