import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Badge } from "react-bootstrap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Legend,
} from "recharts";
import { useSelector, useDispatch } from "react-redux";
import PersonalExpenseForm from "../components/expenses/PersonalExpenseForm";
import PersonalExpenseLedger from "../components/expenses/PersonalExpenseLedger";
import { fetchPersonalExpenses, createExpense, deleteExpense } from "../store/slices/expenseSlice";
import { analyseExpenses, clearAnalysis } from "../store/slices/aiExpenseSlice";

const PIE_COLORS = ["#e94560", "#4ecdc4", "#a29bfe", "#fdcb6e", "#00b894", "#6c5ce7", "#fd79a8", "#dfe6e9", "#b2bec3"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PersonalExpensesPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { personalExpenses: expenses, loading } = useSelector((state) => state.expenses);
  const { analysisLoading, analysisSummary, analysisError } = useSelector((state) => state.aiExpense);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [successAlert, setSuccessAlert] = useState("");

  useEffect(() => {
    dispatch(fetchPersonalExpenses()).unwrap().catch((err) => setError(err));
  }, [dispatch]);

  const handleAddExpense = async (formData) => {
    try {
      await dispatch(createExpense({ ...formData, type: "personal", paidBy: user.id })).unwrap();
      setShowForm(false);
      setSuccessAlert("Expense added successfully!");
      setTimeout(() => setSuccessAlert(""), 3000);
      dispatch(fetchPersonalExpenses());
    } catch (err) {
      setError(err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await dispatch(deleteExpense(expenseId)).unwrap();
      setSuccessAlert("Expense deleted.");
      setTimeout(() => setSuccessAlert(""), 2000);
    } catch (err) {
      setError(err);
    }
  };

  // Monthly bar chart data
  const monthlyMap = expenses.reduce((acc, e) => {
    const month = new Date(e.date).getMonth();
    acc[month] = (acc[month] || 0) + e.amount;
    return acc;
  }, {});
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([month, amount]) => ({ name: MONTH_LABELS[Number(month)], amount }));

  // Category pie chart data
  const categoryMap = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {});
  const pieData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: "#e94560" }} />
          <p className="mt-2 text-muted">Loading expenses…</p>
        </div>
      </div>
    );
  }

  return (
    <Container fluid="xl" className="py-4">
      {error && <Alert variant="danger" dismissible onClose={() => setError("")} className="mb-3">{error}</Alert>}
      {successAlert && (
        <Alert variant="success" dismissible onClose={() => setSuccessAlert("")} className="mb-3">
          {successAlert}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-0" style={{ color: "#1a1a2e" }}>Personal Expenses</h2>
          <p className="text-muted small mb-0">
            Total:{" "}
            <span className="fw-bold" style={{ color: "#e94560" }}>
              ₹{totalSpent.toLocaleString("en-IN")}
            </span>
            {" "}across {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          style={{ backgroundColor: "#e94560", border: "none" }}
          onClick={() => setShowForm(true)}
        >
          + Add Expense
        </Button>
      </div>

      {/* AI Analyse Button */}
      <div className="mb-3">
        <Button
          variant="outline-success"
          className="w-100"
          onClick={() => dispatch(analyseExpenses({ categoryData: pieData, monthlyData: monthlyData.map((d) => ({ month: d.name, totalAmount: d.amount })) }))}
          disabled={analysisLoading || expenses.length === 0}
        >
          {analysisLoading
            ? <><Spinner animation="border" size="sm" className="me-1" />Analysing your expenses...</>
            : "✨ AI Analyse My Expenses"}
        </Button>
      </div>

      {/* AI Analysis Summary Card */}
      {(analysisSummary || analysisError) && (
        <Card className="mb-3 border-success shadow-sm">
          <Card.Body className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <Badge bg="success">AI Summary ✨</Badge>
              </div>
              {analysisError
                ? <p className="text-danger mb-0">{analysisError}</p>
                : <p className="mb-0" style={{ lineHeight: 1.7 }}>{analysisSummary}</p>
              }
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => dispatch(clearAnalysis())}
              style={{ flexShrink: 0 }}
            >
              ×
            </Button>
          </Card.Body>
        </Card>
      )}

      {/* Add Expense Modal */}
      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Modal.Body>
          <PersonalExpenseForm
            onSubmit={handleAddExpense}
            onCancel={() => setShowForm(false)}
          />
        </Modal.Body>
      </Modal>

      {/* Analytics Charts */}
      <Row className="g-4 mb-4">
        <Col xs={12} md={7}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom fw-semibold py-3">
              📅 Monthly Expenses
            </Card.Header>
            <Card.Body>
              {monthlyData.length === 0 ? (
                <Alert variant="info" className="small">No data to chart yet.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString("en-IN")}`, "Spent"]} />
                    <Bar dataKey="amount" fill="#4ecdc4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={5}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom fw-semibold py-3">
              🍕 Category Breakdown
            </Card.Header>
            <Card.Body>
              {pieData.length === 0 ? (
                <Alert variant="info" className="small">No data to chart yet.</Alert>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData.map((item, index) => ({ ...item, fill: PIE_COLORS[index % PIE_COLORS.length] }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    />
                    <Tooltip formatter={(val) => `₹${val.toLocaleString("en-IN")}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Expense Ledger */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-bottom fw-semibold py-3">
          📋 Expense Ledger
        </Card.Header>
        <Card.Body className="p-3">
          <PersonalExpenseLedger
            expenses={expenses}
            onDeleteExpense={handleDeleteExpense}
          />
        </Card.Body>
      </Card>
    </Container>
  );
}
