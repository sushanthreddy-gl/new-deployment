import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container, Card, Button, Spinner, Alert, Modal, Form
} from "react-bootstrap";
import { PieChart, Pie, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useSelector, useDispatch } from "react-redux";
import { fetchGroupById, updateGroup, deleteGroup } from "../store/slices/groupSlice";
import { fetchGroupExpenses, createExpense, deleteExpense } from "../store/slices/expenseSlice";
import { fetchGroupCategories } from "../store/slices/analyticsSlice";
import { fetchCalculatedSettlements, recordSettlement, fetchGroupSettlements } from "../store/slices/settlementSlice";
import GroupExpenseForm from "../components/expenses/GroupExpenseForm";
import GroupExpenseLedger from "../components/expenses/GroupExpenseLedger";
import SettlementSummary from "../components/settlements/SettlementSummary";
import PayConfirmation from "../components/settlements/PayConfirmation";
import AddExpenseModal from "../components/expenses/AddExpenseModal";

const PIE_COLORS = ["#e94560", "#4ecdc4", "#a29bfe", "#fdcb6e", "#00b894", "#6c5ce7", "#fd79a8"];

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentGroup: group, loading } = useSelector((state) => state.groups);
  const { groupExpenses: expenses } = useSelector((state) => state.expenses);
  const { groupCategories } = useSelector((state) => state.analytics);
  const { calculated: calculatedSettlements, history: settlementsHistory } = useSelector((state) => state.settlements);

  const pieData = (groupCategories || []).map((item) => ({ name: item.category, value: item.total }));

  const [error, setError] = useState("");
  const [successAlert, setSuccessAlert] = useState("");

  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [showSettlements, setShowSettlements] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [recordingPayment, setRecordingPayment] = useState(false);

  useEffect(() => {
    dispatch(fetchGroupById(groupId)).unwrap().catch((err) => setError(err));
    dispatch(fetchGroupExpenses(groupId));
    dispatch(fetchGroupCategories(groupId));
  }, [dispatch, groupId]);

  const handleAddExpense = async (formData) => {
    try {
      await dispatch(createExpense({ ...formData, type: "group", groupId, paidBy: formData.paidBy })).unwrap();
      setShowExpenseForm(false);
      setSuccessAlert("Expense added successfully!");
      setTimeout(() => setSuccessAlert(""), 3000);
      dispatch(fetchGroupExpenses(groupId));
      dispatch(fetchGroupById(groupId));
      dispatch(fetchGroupCategories(groupId));
    } catch (err) {
      setError(err);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await dispatch(deleteExpense(expenseId)).unwrap();
      setSuccessAlert("Expense deleted.");
      setTimeout(() => setSuccessAlert(""), 2000);
      dispatch(fetchGroupExpenses(groupId));
      dispatch(fetchGroupCategories(groupId));
    } catch (err) {
      setError(err);
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await dispatch(updateGroup({ id: groupId, data: { name: editName.trim() } })).unwrap();
      setShowEditModal(false);
      setSuccessAlert("Group name updated!");
      setTimeout(() => setSuccessAlert(""), 3000);
    } catch (err) {
      setError(err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteGroup(groupId)).unwrap();
      navigate("/groups");
    } catch (err) {
      setError(err);
      setDeleting(false);
    }
  };

  const handleOpenSettlements = async () => {
    setLoadingSettlements(true);
    setShowSettleConfirm(false);
    try {
      await Promise.all([
        dispatch(fetchCalculatedSettlements(groupId)).unwrap(),
        dispatch(fetchGroupSettlements(groupId)).unwrap(),
      ]);
      setShowSettlements(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingSettlements(false);
    }
  };

  const handlePayConfirm = async (settlement) => {
    setRecordingPayment(true);
    try {
      await dispatch(recordSettlement({
        fromId: settlement.from,
        toId: settlement.to,
        amount: settlement.amount,
        groupId,
      })).unwrap();
      setSelectedPayment(null);
      setSuccessAlert(`Payment of Rs.${settlement.amount.toLocaleString("en-IN")} recorded!`);
      setTimeout(() => setSuccessAlert(""), 3000);
      await Promise.all([
        dispatch(fetchCalculatedSettlements(groupId)).unwrap(),
        dispatch(fetchGroupSettlements(groupId)).unwrap(),
      ]);
    } catch (err) {
      setError(err);
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: "#e94560" }} />
          <p className="mt-2 text-muted">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error || "Group not found."}</Alert>
        <Button variant="link" onClick={() => navigate("/groups")}>Back to Groups</Button>
      </Container>
    );
  }

  const memberMap = {};
  (group.members || []).forEach((m) => { memberMap[m._id] = m.username; });

  const isGroupCreator = group.createdBy?._id === user?.id;

  return (
    <Container fluid="xl" className="py-4">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {successAlert && (
        <Alert variant="success" dismissible onClose={() => setSuccessAlert("")} className="mb-3">
          {successAlert}
        </Alert>
      )}

      {/* Group header */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="d-flex flex-wrap align-items-start justify-content-between gap-3 p-4">
          <div>
            <h3 className="fw-bold mb-1" style={{ color: "#1a1a2e" }}>{group.name}</h3>
            <p className="text-muted small mb-1">
              Created by <strong>{group.createdBy?.username}</strong>
            </p>
            <p className="text-muted small mb-0">
              {group.members?.length} member{group.members?.length !== 1 ? "s" : ""}:{" "}
              {(group.members || []).map((m) => m.username).join(", ")}
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            {isGroupCreator && (
              <>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => { setEditName(group.name); setShowEditModal(true); }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              </>
            )}
            <Button variant="outline-primary" size="sm" onClick={() => navigate("/groups")}>
              Back
            </Button>
          </div>
        </Card.Body>
      </Card>


      {/* Settlement Section */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Settlements</span>
          {!showSettlements && (
            <Button
              style={{ backgroundColor: "#e94560", border: "none" }}
              size="sm"
              onClick={() => setShowSettleConfirm(true)}
              disabled={loadingSettlements}
            >
              {loadingSettlements ? (
                <><Spinner size="sm" animation="border" className="me-1" />Calculating...</>
              ) : (
                "Make Final Settlement"
              )}
            </Button>
          )}
        </Card.Header>
        {showSettlements && (
          <Card.Body>
            <h6 className="fw-semibold mb-3">Outstanding Balances</h6>
            <SettlementSummary
              settlements={calculatedSettlements}
              members={memberMap}
              currentUserId={user?.id}
              onPay={(s) => setSelectedPayment(s)}
            />
            {settlementsHistory.length > 0 && (
              <>
                <h6 className="fw-semibold mt-4 mb-3">Payment History</h6>
                <div className="table-responsive rounded" style={{ border: "1px solid #b2dfdb" }}>
                  <table className="table table-sm table-hover mb-0 table-success">
                    <thead className="table-success">
                      <tr>
                        <th className="py-2 px-3">From</th>
                        <th className="py-2 px-3">To</th>
                        <th className="py-2 px-3">Amount</th>
                        <th className="py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settlementsHistory.map((s) => (
                        <tr key={s._id}>
                          <td className="py-2 px-3 fw-semibold text-danger">
                            {s.fromUser?.username || memberMap[s.fromUser?._id] || "?"}
                          </td>
                          <td className="py-2 px-3 fw-semibold text-success">
                            {s.toUser?.username || memberMap[s.toUser?._id] || "?"}
                          </td>
                          <td className="py-2 px-3">
                            <span className="badge bg-success">
                              Rs.{s.amount.toLocaleString("en-IN")}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted small">
                            {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card.Body>
        )}
      </Card>

      {/* Category Pie Chart */}
      {pieData.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-white border-bottom fw-semibold py-3">
            Spending by Category
          </Card.Header>
          <Card.Body>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData.map((item, i) => ({ ...item, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name }) => name} />
                <Tooltip formatter={(v) => [`Rs.${v.toLocaleString("en-IN")}`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card.Body>
        </Card>
      )}

      {/* Expense Ledger */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Expenses</span>
          <Button
            size="sm"
            style={{ backgroundColor: "#e94560", border: "none" }}
            onClick={() => setShowExpenseForm(true)}
          >
            + Add Expense
          </Button>
        </Card.Header>
        <Card.Body className="p-3">
          <GroupExpenseLedger
            expenses={expenses}
            memberMap={memberMap}
            isGroupCreator={isGroupCreator}
            onDeleteExpense={handleDeleteExpense}
          />
        </Card.Body>
      </Card>

      {/* Add Expense Modal */}
      <AddExpenseModal
        open={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        group={group}
        onAdded={() => {
          dispatch(fetchGroupExpenses(groupId));
          dispatch(fetchGroupById(groupId));
          dispatch(fetchGroupCategories(groupId));
        }}
      />

      {/* Settlement Confirm Modal */}
      <Modal show={showSettleConfirm} onHide={() => setShowSettleConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Final Settlement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Calculate the optimal payments to settle all debts in this group?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowSettleConfirm(false)}>
            Cancel
          </Button>
          <Button style={{ backgroundColor: "#e94560", border: "none" }} onClick={handleOpenSettlements}>
            Calculate
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Group Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Group Name</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Group name"
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>Cancel</Button>
          <Button
            style={{ backgroundColor: "#e94560", border: "none" }}
            onClick={handleEditSave}
            disabled={editSaving}
          >
            {editSaving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Delete Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete <strong>{group.name}</strong>? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDeleteGroup} disabled={deleting}>
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Pay Confirmation Modal */}
      <PayConfirmation
        settlement={selectedPayment}
        members={memberMap}
        onConfirm={handlePayConfirm}
        onCancel={() => setSelectedPayment(null)}
        confirming={recordingPayment}
      />
    </Container>
  );
}

