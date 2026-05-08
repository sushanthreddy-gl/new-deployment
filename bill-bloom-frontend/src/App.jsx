import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { loadUser } from "./store/slices/authSlice";
import Header from "./components/layout/Header";
import NavLinks from "./components/layout/NavLinks";
import Footer from "./components/layout/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import GroupsPage from "./pages/GroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import PersonalExpensesPage from "./pages/PersonalExpensesPage";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";

export default function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  return (
    <>
      <Header />
      {isAuthenticated && <NavLinks />}
      <main>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<AuthPage page="login" />} />
          <Route path="/register" element={<AuthPage page="register" />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/groups/:groupId" element={<GroupDetailPage />} />
            <Route path="/expenses" element={<PersonalExpensesPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
