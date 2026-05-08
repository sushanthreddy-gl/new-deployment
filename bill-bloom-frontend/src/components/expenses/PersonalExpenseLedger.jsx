import { useState } from "react";
import { Table, Button, Badge, Alert } from "react-bootstrap";

export default function PersonalExpenseLedger({ expenses, onDeleteExpense }) {
  const [deletingId, setDeletingId] = useState(null);

  if (!expenses || expenses.length === 0) {
    return (
      <Alert variant="info" className="mt-2">
        No personal expenses recorded yet. Add your first expense!
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

  return (
    <Table striped bordered hover responsive className="mt-2 align-middle">
      <thead className="table-dark">
        <tr>
          <th>Description</th>
          <th>Amount (₹)</th>
          <th>Category</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {expenses.map((expense) => (
          <tr key={expense._id} className={deletingId === expense._id ? "table-danger" : ""}>
            <td>{expense.description || <span className="text-muted">—</span>}</td>
            <td className="fw-semibold">₹{expense.amount.toLocaleString("en-IN")}</td>
            <td>
              <Badge bg={categoryColors[expense.category] || "secondary"}>
                {expense.category}
              </Badge>
            </td>
            <td>{new Date(expense.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            <td>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(expense)}
              >
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
