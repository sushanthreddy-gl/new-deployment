import { useState } from "react";
import { Form, Button, Card, Row, Col } from "react-bootstrap";
import { expenseCategories } from "../../constants";
import { useSelector } from "react-redux";

export default function PersonalExpenseForm({ onSubmit, onCancel }) {
  const { user } = useSelector((state) => state.auth);
  const [form, setForm] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.amount) {
      newErrors.amount = "Amount is required.";
    } else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      newErrors.amount = "Amount must be greater than 0.";
    }
    if (!form.category) newErrors.category = "Please select a category.";
    if (!form.description) newErrors.description = "Description is required.";
    if (!form.date)     newErrors.date     = "Date is required.";
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    const payload = {
      amount: Number(form.amount),
      category: form.category,
      description: form.description.trim(),
      date: form.date,
      paidBy: user?.id,
    };
    console.log("Personal expense data:", payload);
    onSubmit && onSubmit(payload);
    setForm({ amount: "", category: "", description: "", date: new Date().toISOString().split("T")[0] });
    setErrors({});
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center border-bottom py-3">
        <h5 className="mb-0 fw-bold">Add Personal Expense</h5>
        {onCancel && <Button variant="outline-secondary" size="sm" onClick={onCancel}>✕</Button>}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} noValidate>
          <Row className="g-3 mb-3">
            <Col xs={12} sm={6}>
              <Form.Group controlId="pe-amount">
                <Form.Label className="fw-semibold">Amount (₹)</Form.Label>
                <Form.Control
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="e.g. 500"
                  isInvalid={!!errors.amount}
                />
                <Form.Control.Feedback type="invalid">{errors.amount}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Group controlId="pe-category">
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

          <Form.Group className="mb-3" controlId="pe-desc">
            <Form.Label className="fw-semibold">Description</Form.Label>
            <Form.Control
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What did you spend on?"
              isInvalid={!!errors.description}
            />
            <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-4" controlId="pe-date">
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

          <div className="d-flex gap-2">
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

