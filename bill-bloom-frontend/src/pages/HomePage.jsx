import { useState, useEffect } from "react";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchGroups } from "../store/slices/groupSlice";
import { fetchMonthlyPersonal } from "../store/slices/analyticsSlice";

export default function HomePage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { groups } = useSelector((state) => state.groups);
  const { monthlyPersonal } = useSelector((state) => state.analytics);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);

  useEffect(() => {
    Promise.all([
      dispatch(fetchGroups()).unwrap(),
      dispatch(fetchMonthlyPersonal()).unwrap(),
    ])
      .then(([groupsList, monthly]) => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const thisMonth = (monthly || [])
          .filter((d) => d.year === currentYear && d.month === currentMonth)
          .reduce((sum, d) => sum + d.total, 0);

        const thisYear = (monthly || [])
          .filter((d) => d.year === currentYear)
          .reduce((sum, d) => sum + d.total, 0);

        setStats([
          { label: "My Groups",             value: (groupsList || []).length,                       icon: "👥", color: "#4ecdc4", path: "/groups"   },
          { label: "Total Groups Joined",   value: (groupsList || []).length,                       icon: "🤝", color: "#a29bfe", path: "/groups"   },
          { label: "This Month's Expenses", value: `₹${thisMonth.toLocaleString("en-IN")}`,            icon: "📅", color: "#fdcb6e", path: "/expenses" },
          { label: "This Year's Expenses",  value: `₹${thisYear.toLocaleString("en-IN")}`,             icon: "💸", color: "#e94560", path: "/expenses" },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dispatch]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: "#e94560" }} />
          <p className="mt-2 text-muted">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: "➕", label: "Add Personal Expense", path: "/expenses"  },
    { icon: "👥", label: "View My Groups",        path: "/groups"    },
    { icon: "💳", label: "Create a Group",        path: "/groups"    },
    { icon: "📊", label: "Expense Analysis",      path: "/analytics" },
  ];

  return (
    <Container fluid="xl" className="py-4">
      {/* Hero */}
      <div
        className="rounded-4 p-4 p-md-5 mb-4 d-flex align-items-center justify-content-between"
        style={{ background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)", color: "#1a1a2e", minHeight: 180, border: "1px solid #dee2e6" }}
      >
        <div>
          <h1 className="fw-bold mb-1" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
            Welcome back,{" "}
            <span style={{ color: "#e94560" }}>{user?.username}</span> 👋
          </h1>
          <p className="text-muted mb-3">Track your personal and group expenses in one place.</p>
          <div className="d-flex gap-2 flex-wrap">
            <Button
              style={{ backgroundColor: "#e94560", border: "none" }}
              onClick={() => navigate("/expenses")}
            >
              Track Expenses
            </Button>
            <Button variant="outline-secondary" onClick={() => navigate("/groups")}>
              View Groups
            </Button>
          </div>
        </div>
        <div style={{ fontSize: "clamp(3rem, 8vw, 5rem)", opacity: 0.35 }}>💰</div>
      </div>

      {/* Stats */}
      <Row className="g-3 mb-4">
        {stats.map((stat) => (
          <Col key={stat.label} xs={6} lg={3}>
            <Card
              className="h-100 border-0 shadow-sm text-center p-3"
              style={{ cursor: "pointer", transition: "transform 0.15s" }}
              onClick={() => navigate(stat.path)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = ""}
            >
              <div
                className="rounded-3 d-flex align-items-center justify-content-center mx-auto mb-2"
                style={{ width: 44, height: 44, backgroundColor: `${stat.color}22`, fontSize: 22 }}
              >
                {stat.icon}
              </div>
              <div className="fw-bold fs-4" style={{ color: "#1a1a2e" }}>{stat.value}</div>
              <div className="text-muted small">{stat.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Quick Actions */}
      <h5 className="fw-bold mb-3">Quick Actions</h5>
      <Row className="g-3">
        {quickActions.map((item) => (
          <Col key={item.label} xs={6} sm={3}>
            <Card
              className="border-0 shadow-sm text-center p-3 h-100"
              style={{ cursor: "pointer", transition: "transform 0.15s" }}
              onClick={() => navigate(item.path)}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = ""}
            >
              <div style={{ fontSize: "1.8rem", marginBottom: "0.4rem" }}>{item.icon}</div>
              <div className="small fw-semibold" style={{ color: "#1a1a2e" }}>{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

