import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Modal, Button, Form, FloatingLabel, Nav, Spinner } from "react-bootstrap";
import {
  setMode, setNlText, setAmount, setDescription, setCategory, setDate,
  setPaidBy, toggleParticipant, setFormError, resetForm,
  parseExpenseAI, submitExpense, scanBillImage,
} from "../../store/slices/aiExpenseSlice";
import useVoiceInput from "../../hooks/useVoiceInput";
import { expenseCategories } from "../../constants";

const AddExpenseModal = ({ open, onClose, group, onAdded }) => {
  const dispatch = useDispatch();
  const {
    mode, nlText, aiLoading, aiError,
    amount, description, category, date, paidBy, participants,
    submitLoading, formError,
    scanLoading, scanError,
  } = useSelector((state) => state.aiExpense);

  const today = new Date().toISOString().split("T")[0];
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) dispatch(resetForm());
  }, [open, dispatch]);

  // ── Voice input (Web Speech API) ──────────────────────────────────────────
  const { listening, toggle: toggleVoice } = useVoiceInput((transcript) =>
    dispatch(setNlText(transcript))
  );

  // ── Bill image upload ─────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      dispatch(scanBillImage(reader.result));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAIParse = () => {
    if (!nlText.trim()) return;
    dispatch(parseExpenseAI({ text: nlText, members: group.members }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(setFormError(""));

    if (!amount || !description || !category || !paidBy || participants.length < 2) {
      dispatch(setFormError("All fields are required and at least 2 participants are needed."));
      return;
    }

    if (participants.length === 1 && participants[0] === paidBy) {
      dispatch(setFormError("A group expense must include at least one participant other than the payer."));
      return;
    }

    const resultAction = await dispatch(submitExpense({
      amount: Number(amount),
      description,
      category,
      groupId: group._id,
      paidBy,
      participants,
      splitType: "equal",
      date,
      type: "group",
    }));

    if (submitExpense.fulfilled.match(resultAction)) {
      onAdded();
      onClose();
      dispatch(resetForm());
    }
  };

  return (
    <Modal show={open} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add Expense</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Nav variant="tabs" className="mb-3" activeKey={mode} onSelect={(k) => dispatch(setMode(k))}>
          <Nav.Item>
            <Nav.Link eventKey="manual">Manual</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="ai">AI Parse ✨</Nav.Link>
          </Nav.Item>
        </Nav>

        {/* ── AI Tab ─────────────────────────────────────────────────────── */}
        {mode === "ai" && (
          <div className="mb-3">
            <Form.Group className="mb-2">
              <Form.Control
                as="textarea"
                rows={3}
                placeholder='e.g. "I paid ₹800 for dinner with Priya and Karan last Friday"'
                value={nlText}
                onChange={(e) => dispatch(setNlText(e.target.value))}
              />
            </Form.Group>
            {aiError && <p className="text-danger small">{aiError}</p>}
            {scanError && <p className="text-danger small">{scanError}</p>}
            <div className="d-flex gap-2 flex-wrap">
              <Button
                variant="success"
                onClick={handleAIParse}
                disabled={aiLoading || scanLoading || !nlText.trim()}
              >
                {aiLoading ? (
                  <><Spinner animation="border" size="sm" className="me-1" />Parsing...</>
                ) : (
                  "Parse with AI ✨"
                )}
              </Button>
              <Button
                variant={listening ? "danger" : "outline-primary"}
                onClick={toggleVoice}
                disabled={aiLoading || scanLoading}
                title={listening ? "Stop listening" : "Speak to fill input"}
              >
                {listening ? "🔴 Stop" : "🎙️ Voice"}
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={aiLoading || scanLoading}
                title="Upload a bill image"
              >
                {scanLoading ? (
                  <><Spinner animation="border" size="sm" className="me-1" />Scanning...</>
                ) : (
                  "📷 Scan Bill"
                )}
              </Button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </div>
            <p className="text-muted small mt-2">
              After parsing, switch to the <strong>Manual</strong> tab to review and submit.
            </p>
          </div>
        )}

        {/* ── Manual Tab ─────────────────────────────────────────────────── */}
        {mode === "manual" && (
          <>
            {formError && <p className="text-danger">{formError}</p>}
            <Form onSubmit={handleSubmit}>
              <FloatingLabel label="Amount (₹)" className="mb-3">
                <Form.Control
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => dispatch(setAmount(e.target.value))}
                  required
                />
              </FloatingLabel>

              <FloatingLabel label="Description" className="mb-3">
                <Form.Control
                  type="text"
                  value={description}
                  onChange={(e) => dispatch(setDescription(e.target.value))}
                  required
                />
              </FloatingLabel>

              <Form.Group className="mb-3">
                <Form.Label>Category</Form.Label>
                <Form.Select
                  value={category}
                  onChange={(e) => dispatch(setCategory(e.target.value))}
                  required
                >
                  <option value="">Select category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => dispatch(setDate(e.target.value))}
                  max={today}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Paid By</Form.Label>
                <Form.Select
                  value={paidBy}
                  onChange={(e) => dispatch(setPaidBy(e.target.value))}
                  required
                >
                  <option value="">Select member</option>
                  {(group.members || []).map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.username}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Participants</Form.Label>
                <div className="d-flex flex-column gap-1">
                  {(group.members || []).map((m) => (
                    <Form.Check
                      key={m._id}
                      type="checkbox"
                      label={m.username}
                      checked={participants.includes(m._id)}
                      onChange={() => dispatch(toggleParticipant(m._id))}
                    />
                  ))}
                </div>
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={submitLoading}>
                  {submitLoading
                    ? <><Spinner animation="border" size="sm" className="me-1" />Adding...</>
                    : "Add Expense"}
                </Button>
              </div>
            </Form>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default AddExpenseModal;
