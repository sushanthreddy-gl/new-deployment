import { useState } from "react";
import { Form, Button, Alert, Card } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { loginUser } from "../../store/slices/authSlice";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!form.email) {
      newErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(form.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!form.password) {
      newErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (apiError) setApiError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSubmitting(true);
    setApiError("");
    try {
      await dispatch(loginUser({ email: form.email, password: form.password })).unwrap();
      navigate("/");
    } catch (err) {
      setApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border-0" style={{ maxWidth: 440, width: "100%" }}>
      <Card.Body className="p-4">
        <h2 className="fw-bold mb-1" style={{ color: "#1a1a2e" }}>Welcome Back</h2>
        <p className="text-muted mb-3">Sign in to your Bill Bloom account</p>

        {apiError && <Alert variant="danger" dismissible onClose={() => setApiError("")}>{apiError}</Alert>}

        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="login-email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              isInvalid={!!errors.email}
            />
            <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="login-password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              isInvalid={!!errors.password}
            />
            <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
          </Form.Group>

          <div className="d-grid mt-4">
            <Button type="submit" style={{ backgroundColor: "#e94560", border: "none" }} disabled={submitting}>
              {submitting ? "Signing in…" : "Sign In"}
            </Button>
          </div>
        </Form>

        <p className="text-center mt-3 mb-0 small text-muted">
          Don&apos;t have an account?{" "}
          <Link to="/register" style={{ color: "#e94560" }}>Register here</Link>
        </p>
      </Card.Body>
    </Card>
  );
}
