import { useState } from "react";
import { Form, Button, Card, Row, Col, Alert } from "react-bootstrap";
import { expenseCategories } from "../../constants";

export default function GroupExpenseForm({ members = [], onSubmit, onCancel }) {
  const [form, setForm] = useState({
    amount: "", category: "", description: "",
    date: new Date().toISOString().split("T")[0],
    paidBy: "", participants: [],
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.amount) {
      newErrors.amount = "Amount is required.";
    } else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0.";
    }
    if (!form.category)               newErrors.category     = "Please select a category.";
    if (!form.description.trim())     newErrors.description  = "Description cannot be empty.";
    if (!form.paidBy)                 newErrors.paidBy       = "Please select who paid.";
    if (form.participants.length < 2) newErrors.participants = "Select at least 2 participants.";
    if (!form.date)                   newErrors.date         = "Date is required.";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const toggleParticipant = (userId) => {
    setForm((prev) => ({
      ...prev,
      participants: prev.participants.includes(userId)
        ? prev.participants.filter((id) => id !== userId)
        : [...prev.participants, userId],
    }));
    if (errors.participants) setErrors((prev) => ({ ...prev, participants: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    const payload = {
      amount: Number(form.amount), category: form.category,
      description: form.description.trim(), date: form.date,
      paidBy: form.paidBy, participants: form.participants, splitType: "equal",
    };
    console.log("Group expense data:", payload);
    onSubmit && onSubmit(payload);
    setForm({ amount: "", category: "", description: "", date: new Date().toISOString().split("T")[0], paidBy: "", participants: [] });
    setErrors({});
  };

  const perHead = form.participants.length >= 2 && Number(form.amount) > 0
    ? (Number(form.amount) / form.participants.length).toFixed(2)
    : null;

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center border-bottom py-3">
        <h5 className="mb-0 fw-bold">Add Group Expense</h5>
        {onCancel && <Button variant="outline-secondary" size="sm" onClick={onCancel}>✕</Button>}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} noValidate>
          <Row className="g-3 mb-3">
            <Col xs={12} sm={6}>
              <Form.Group controlId="ge-amount">
                <Form.Label className="fw-semibold">Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="e.g. 1500"
                  isInvalid={!!errors.amount}
                />
                <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group controlId="ge-category">
                <Form.Label className="fw-semibold">Category</Form.Label>
                <Form.Select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  isInvalid={!!errors.category}
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.category}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col xs={12} sm={8}>
              <Form.Group controlId="ge-desc">
                <Form.Label className="fw-semibold">Description</Form.Label>
                <Form.Control
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="e.g. Beach shack dinner"
                  isInvalid={!!errors.description}
                />
                <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Group controlId="ge-date">
                <Form.Label className="fw-semibold">Date</Form.Label>
                <Form.Control
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  isInvalid={!!errors.date}
                />
                <Form.Control.Feedback type="invalid">{errors.date}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3" controlId="ge-paidby">
            <Form.Label className="fw-semibold">Paid By</Form.Label>
            <Form.Select
              name="paidBy"
              value={form.paidBy}
              onChange={handleChange}
              isInvalid={!!errors.paidBy}
            >
              <option value="">Who paid?</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.username}</option>
              ))}
            </Form.Select>
            <Form.Control.Feedback type="invalid">{errors.paidBy}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Participants <span className="text-muted fw-normal fs-6">(select at least 2)</span>
            </Form.Label>
            {members.map((member) => (
              <Form.Check
                key={member._id}
                type="checkbox"
                id={`participant-${member._id}`}
                label={
                  <span className="d-flex align-items-center gap-2">
                    {member.username}
                    {form.participants.includes(member._id) && perHead && (
                      <span className="badge rounded-pill text-white ms-1" style={{ backgroundColor: "#e94560", fontSize: "0.75rem" }}>
                        ₹{perHead}
                      </span>
                    )}
                  </span>
                }
                checked={form.participants.includes(member._id)}
                onChange={() => toggleParticipant(member._id)}
                className="mb-1"
              />
            ))}
            {errors.participants && (
              <div className="text-danger small mt-1">{errors.participants}</div>
            )}
            {perHead && (
              <Alert variant="info" className="mt-2 py-2 small">
                💡 Split equally: <strong>₹{perHead}</strong> per person
              </Alert>
            )}
          </Form.Group>

          <div className="d-flex gap-2 mt-4">
            <Button type="submit" style={{ backgroundColor: "#e94560", border: "none" }}>
              Add Expense
            </Button>
            {onCancel && (
              <Button type="button" variant="outline-secondary" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}