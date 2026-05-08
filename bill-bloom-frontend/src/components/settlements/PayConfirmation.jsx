import { Modal, Button, Spinner } from "react-bootstrap";

// members: { [userId]: username }
export default function PayConfirmation({ settlement, members = {}, onConfirm, onCancel, confirming = false }) {
  if (!settlement) return null;

  const fromUsername = members[settlement.from] || settlement.from;
  const toUsername = members[settlement.to] || settlement.to;

  return (
    <Modal show={!!settlement} onHide={onCancel} centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title>💳 Confirm Payment</Modal.Title>
      </Modal.Header>

      <Modal.Body className="text-center py-4">
        <p className="text-muted mb-1">You are about to pay</p>
        <p
          className="display-5 fw-bold my-2"
          style={{ color: "#e94560" }}
        >
          ₹{settlement.amount.toLocaleString("en-IN")}
        </p>
        <p className="fs-5">
          to <strong>{toUsername}</strong>
        </p>
        <p className="text-muted small mt-2">
          From: <strong>{fromUsername}</strong>. This will be recorded permanently.
        </p>
      </Modal.Body>

      <Modal.Footer className="justify-content-center gap-3">
        <Button variant="outline-secondary" onClick={onCancel} disabled={confirming}>
          Cancel
        </Button>
        <Button variant="success" onClick={() => onConfirm && onConfirm(settlement)} disabled={confirming}>
          {confirming ? <><Spinner size="sm" animation="border" className="me-1" />Recording…</> : "✅ Confirm Payment"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
