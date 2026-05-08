import { useEffect, useState } from "react";
import { Container, Row, Col, Card, Spinner, Alert, Form } from "react-bootstrap";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Legend,
} from "recharts";
import { useSelector, useDispatch } from "react-redux";
import { fetchMonthlyPersonal, fetchGroupSpending, fetchPersonalCategories, fetchGroupCategories } from "../store/slices/analyticsSlice";
import { fetchGroups } from "../store/slices/groupSlice";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PIE_COLORS = ["#6c63ff", "#e94560", "#43C59E", "#f5a623", "#4facfe", "#f093fb", "#a8edea", "#fd746c"];

function SectionCard({ title, loading, error, children }) {
  return (
    <Card className="shadow-sm border-0 h-100">
      <Card.Body>
        <h6 className="fw-bold text-muted text-uppercase mb-3" style={{ letterSpacing: "0.5px", fontSize: "0.8rem" }}>
          {title}
        </h6>
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 200 }}>
            <Spinner animation="border" variant="primary" />
          </div>
        ) : error ? (
          <Alert variant="danger" className="mb-0">{error}</Alert>
        ) : (
          children
        )}
      </Card.Body>
    </Card>
  );
}

export default function AnalyticsDashboard() {
  const dispatch = useDispatch();
  const { groups } = useSelector((state) => state.groups);
  const {
    monthlyPersonal,
    groupSpending: groupSpend,
    personalCategories: personalCat,
    groupCategories: groupCat,
    loading,
    error,
  } = useSelector((state) => state.analytics);

  const [selectedGroupId, setSelectedGroupId] = useState("");

  const monthly = (monthlyPersonal || []).map((d) => ({
    label: `${MONTH_NAMES[(d.month || 1) - 1]} ${d.year}`,
    total: d.total,
  }));

  useEffect(() => {
    dispatch(fetchMonthlyPersonal());
    dispatch(fetchGroupSpending());
    dispatch(fetchPersonalCategories());
    dispatch(fetchGroups()).unwrap().then((list) => {
      if (list.length > 0) setSelectedGroupId(list[0]._id);
    }).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (!selectedGroupId) return;
    dispatch(fetchGroupCategories(selectedGroupId));
  }, [dispatch, selectedGroupId]);

  return (
    <Container className="py-4">
      <h4 className="fw-bold mb-4">Analytics Dashboard</h4>

      <Row className="g-4">
        {/* Monthly Personal Spending */}
        <Col xs={12} lg={6}>
          <SectionCard title="Monthly Personal Spending" loading={loading.monthly} error={error.monthly}>
            {monthly.length === 0 ? (
              <p className="text-muted text-center py-4">No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Total"]} />
                  <Bar dataKey="total" fill="#6c63ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Col>

        {/* Group Spending */}
        <Col xs={12} lg={6}>
          <SectionCard title="Spending by Group" loading={loading.groupSpend} error={error.groupSpend}>
            {groupSpend.length === 0 ? (
              <p className="text-muted text-center py-4">No group expenses yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={groupSpend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="groupName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Total"]} />
                  <Bar dataKey="total" fill="#e94560" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Col>

        {/* Personal Category Breakdown */}
        <Col xs={12} lg={6}>
          <SectionCard title="Personal Expenses by Category" loading={loading.personalCat} error={error.personalCat}>
            {personalCat.length === 0 ? (
              <p className="text-muted text-center py-4">No personal expenses yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={personalCat.map((item, i) => ({ ...item, fill: PIE_COLORS[i % PIE_COLORS.length] }))} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={90} label={({ category }) => category} />
                  <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Total"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </SectionCard>
        </Col>

        {/* Group Category Breakdown */}
        <Col xs={12} lg={6}>
          <SectionCard
            title="Group Expenses by Category"
            loading={loading.groupCat && selectedGroupId !== ""}
            error={error.groupCat}
          >
            {groups.length === 0 ? (
              <p className="text-muted text-center py-4">No groups found.</p>
            ) : (
              <>
                <Form.Select
                  size="sm"
                  className="mb-3"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>{g.name}</option>
                  ))}
                </Form.Select>
                {loading.groupCat ? (
                  <div className="d-flex justify-content-center py-4">
                    <Spinner animation="border" size="sm" variant="primary" />
                  </div>
                ) : groupCat.length === 0 ? (
                  <p className="text-muted text-center py-4">No expenses for this group.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={groupCat.map((item, i) => ({ ...item, fill: PIE_COLORS[i % PIE_COLORS.length] }))} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category }) => category} />
                      <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Total"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </>
            )}
          </SectionCard>
        </Col>
      </Row>
    </Container>
  );
}
