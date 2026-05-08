import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../services/axiosInstance";

const todayStr = () => new Date().toISOString().split("T")[0];

// ── Thunk: call backend AI parse endpoint ────────────────────────────────────
export const parseExpenseAI = createAsyncThunk(
  "aiExpense/parse",
  async ({ text, members }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/ai/parse-expense", { text, members });
      return res.data; // { amount, description, category, participantIds, paidById, date }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "AI parsing failed. Please try again.");
    }
  }
);

// ── Thunk: submit the expense to /expenses ───────────────────────────────────
export const submitExpense = createAsyncThunk(
  "aiExpense/submit",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/expenses", payload);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to add expense");
    }
  }
);

// ── Thunk: analyse personal expenses ────────────────────────────────────────
export const analyseExpenses = createAsyncThunk(
  "aiExpense/analyse",
  async ({ categoryData, monthlyData }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/ai/analyse-personal", { categoryData, monthlyData });
      return res.data.summary;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "AI analysis failed. Please try again.");
    }
  }
);

// ── Thunk: scan bill image via Gemini vision ─────────────────────────────────
export const scanBillImage = createAsyncThunk(
  "aiExpense/scanBill",
  async (base64Image, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/ai/scan-bill", { image: base64Image });
      return res.data.text;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Bill scan failed. Please try again.");
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────
const aiExpenseSlice = createSlice({
  name: "aiExpense",
  initialState: {
    mode: "manual", // "manual" | "ai"
    nlText: "",
    aiLoading: false,
    aiError: "",
    scanLoading: false,
    scanError: "",
    // form fields
    amount: "",
    description: "",
    category: "",
    date: todayStr(),
    paidBy: "",
    participants: [],
    // submit state
    submitLoading: false,
    formError: "",
    // analysis state
    analysisLoading: false,
    analysisSummary: "",
    analysisError: "",
  },
  reducers: {
    setMode: (state, action) => { state.mode = action.payload; },
    setNlText: (state, action) => { state.nlText = action.payload; },
    setAmount: (state, action) => { state.amount = action.payload; },
    setDescription: (state, action) => { state.description = action.payload; },
    setCategory: (state, action) => { state.category = action.payload; },
    setDate: (state, action) => { state.date = action.payload; },
    setPaidBy: (state, action) => { state.paidBy = action.payload; },
    toggleParticipant: (state, action) => {
      const id = action.payload;
      const idx = state.participants.indexOf(id);
      if (idx === -1) state.participants.push(id);
      else state.participants.splice(idx, 1);
    },
    setFormError: (state, action) => { state.formError = action.payload; },
    clearAnalysis: (state) => {
      state.analysisSummary = "";
      state.analysisError = "";
    },
    resetForm: (state) => {
      state.mode = "manual";
      state.nlText = "";
      state.aiLoading = false;
      state.aiError = "";
      state.amount = "";
      state.description = "";
      state.category = "";
      state.date = todayStr();
      state.paidBy = "";
      state.participants = [];
      state.submitLoading = false;
      state.formError = "";
      state.scanLoading = false;
      state.scanError = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // parse
      .addCase(parseExpenseAI.pending, (state) => {
        state.aiLoading = true;
        state.aiError = "";
      })
      .addCase(parseExpenseAI.fulfilled, (state, action) => {
        state.aiLoading = false;
        const { amount, description, category, date, participantIds, paidById } = action.payload;
        state.amount = String(amount ?? "");
        state.description = description ?? "";
        state.category = category ?? "";
        const today = todayStr();
        state.date = date && date <= today ? date : today;
        state.participants = participantIds ?? [];
        state.paidBy = paidById ?? "";
        state.mode = "manual"; // auto-switch to manual tab to review filled fields
      })
      .addCase(parseExpenseAI.rejected, (state, action) => {
        state.aiLoading = false;
        state.aiError = action.payload || "AI parsing failed. Please try again.";
      })
      // submit
      .addCase(submitExpense.pending, (state) => {
        state.submitLoading = true;
        state.formError = "";
      })
      .addCase(submitExpense.fulfilled, (state) => {
        state.submitLoading = false;
      })
      .addCase(submitExpense.rejected, (state, action) => {
        state.submitLoading = false;
        state.formError = action.payload || "Failed to add expense";
      })
      // analyse
      .addCase(analyseExpenses.pending, (state) => {
        state.analysisLoading = true;
        state.analysisSummary = "";
        state.analysisError = "";
      })
      .addCase(analyseExpenses.fulfilled, (state, action) => {
        state.analysisLoading = false;
        state.analysisSummary = action.payload;
      })
      .addCase(analyseExpenses.rejected, (state, action) => {
        state.analysisLoading = false;
        state.analysisError = action.payload || "AI analysis failed. Please try again.";
      })
      // scan bill
      .addCase(scanBillImage.pending, (state) => {
        state.scanLoading = true;
        state.scanError = "";
      })
      .addCase(scanBillImage.fulfilled, (state, action) => {
        state.scanLoading = false;
        state.nlText = action.payload; // fill AI textarea with extracted text
      })
      .addCase(scanBillImage.rejected, (state, action) => {
        state.scanLoading = false;
        state.scanError = action.payload || "Bill scan failed. Please try again.";
      });
  },
});

export const {
  setMode, setNlText, setAmount, setDescription, setCategory, setDate,
  setPaidBy, toggleParticipant, setFormError, clearAnalysis, resetForm,
} = aiExpenseSlice.actions;

export default aiExpenseSlice.reducer;
