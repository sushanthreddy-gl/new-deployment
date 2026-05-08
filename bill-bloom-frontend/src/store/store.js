import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import groupReducer from "./slices/groupSlice";
import expenseReducer from "./slices/expenseSlice";
import settlementReducer from "./slices/settlementSlice";
import analyticsReducer from "./slices/analyticsSlice";
import aiExpenseReducer from "./slices/aiExpenseSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    groups: groupReducer,
    expenses: expenseReducer,
    settlements: settlementReducer,
    analytics: analyticsReducer,
    aiExpense: aiExpenseReducer,
  },
});

export default store;
