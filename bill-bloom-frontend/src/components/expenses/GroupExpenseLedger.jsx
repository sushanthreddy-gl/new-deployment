import { useState } from "react";
import { Table, Button, Badge, Alert } from "react-bootstrap";

export default function GroupExpenseLedger({ expenses, memberMap = {}, isGroupCreator, onDeleteExpense }) {
  const [deletingId, setDeletingId] = useState(null);

  if (!expenses || expenses.length === 0) {
    return (
      <Alert variant="info" className="mt-2">
        No group expenses recorded yet. Add the first expense!
      </Alert>
    );
  }

  const handleDelete = (expense) => {
    if (window.confirm(`Delete "${expense.description || expense.category}"? This cannot be undone.`)) {
      setDeletingId(expense._id);
      onDeleteExpense && onDeleteExpense(expense._id);
      setTimeout(() => setDeletingId(null), 500);
    }
  };

  const categoryColors = {
    Food: "success",
    Transport: "primary",
    Entertainment: "warning",
    Utilities: "secondary",
    Healthcare: "danger",
    Shopping: "info",
    Travel: "dark",
    Education: "light",
    Other: "secondary",
  };

  // Participants may be populated objects {_id, username} or plain ID strings
  const normalizeParticipantId = (p) =>
    typeof p === "object" && p !== null ? String(p._id) : String(p);
  const normalizeParticipantUsername = (p) =>
    typeof p === "object" && p !== null ? p.username : (memberMap[String(p)] || String(p));

  // Build a de-duplicated participant list from all expenses
  const seenIds = new Set();
  const allParticipants = [];
  expenses.forEach((e) => {
    (e.participants || []).forEach((p) => {
      const id = normalizeParticipantId(p);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        allParticipants.push({ id, username: normalizeParticipantUsername(p) });
      }
    });
  });

  const totalGroupExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPerParticipant = allParticipants.reduce((acc, p) => {
    acc[p.id] = expenses.reduce((sum, e) => {
      if (e.participants?.some((participant) => normalizeParticipantId(participant) === p.id)) {
        return sum + e.amount / e.participants.length;
      }
      return sum;
    }, 0);
    return acc;
  }, {});

  return (
    <Table striped bordered hover responsive className="mt-2 align-middle">
      <thead className="table-dark">
        <tr>
          <th>#</th>
          <th>Description</th>
          <th>Amount (₹)</th>
          <th>Date</th>
          <th>Paid By</th>
          {allParticipants.map((p) => (
            <th key={p.id}>{p.username}</th>
          ))}
          <th>Category</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense, index) => {
          const paidByUsername = typeof expense.paidBy === "object"
            ? expense.paidBy?.username
            : (memberMap[expense.paidBy] || expense.paidBy || "Unknown");
          const splitAmount = expense.participants?.length
            ? (expense.amount / expense.participants.length)
            : 0;
          return (
            <tr key={expense._id} className={deletingId === expense._id ? "table-danger" : ""}>
              <td className="text-muted">{index + 1}</td>
              <td>{expense.description || <span className="text-muted">—</span>}</td>
              <td className="fw-semibold">₹{expense.amount.toLocaleString("en-IN")}</td>
              <td>{new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
              <td>{paidByUsername}</td>
              {allParticipants.map((p) => (
                <td key={p.id} className="text-center">
                  {expense.participants?.some((participant) => normalizeParticipantId(participant) === p.id)
                    ? <span className="fw-semibold">₹{splitAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    : <span className="text-muted">—</span>}
                </td>
              ))}
              <td>
                <Badge bg={categoryColors[expense.category] || "secondary"}>
                  {expense.category}
                </Badge>
              </td>
              <td>
                <span title={!isGroupCreator ? "Only group creators can delete expenses" : ""} style={{ display: "inline-block", cursor: !isGroupCreator ? "not-allowed" : "default" }}>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    disabled={!isGroupCreator}
                    style={!isGroupCreator ? { pointerEvents: "none" } : {}}
                    onClick={() => handleDelete(expense)}
                  >
                    Delete
                  </Button>
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot className="table-dark fw-bold">
        <tr>
          <td colSpan={2} className="text-end">Total</td>
          <td colSpan={3}>₹{totalGroupExpense.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td>
          {allParticipants.map((p) => (
            <td key={p.id} className="text-center">
              ₹{totalPerParticipant[p.id].toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </td>
          ))}
          <td colSpan={2}></td>
        </tr>
      </tfoot>
    </Table>
  );
}
