import { ListGroup, Button, Alert, Badge } from "react-bootstrap";

// members: { [userId]: username }
// currentUserId: logged-in user's _id
export default function SettlementSummary({ settlements, members = {}, currentUserId, onPay }) {
  const hasPending = settlements && settlements.length > 0;

  const getUsername = (id) => members[id] || id;

  return (
    <div>
      {hasPending ? (
        <ListGroup className="mb-4">
          {settlements.map((s) => {
            const isMyOwe = s.from === currentUserId;

            return (
              <ListGroup.Item
                key={`${s.from}-${s.to}`}
                className="d-flex justify-content-between align-items-center py-3"
                variant={isMyOwe ? "warning" : ""}
              >
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-semibold">{getUsername(s.from)}</span>
                  <span className="text-muted">→</span>
                  <span className="fw-semibold">{getUsername(s.to)}</span>
                  <Badge bg="danger" className="ms-1">
                    ₹{s.amount.toLocaleString("en-IN")}
                  </Badge>
                  {isMyOwe && (
                    <Badge bg="warning" text="dark">You owe</Badge>
                  )}
                </div>
                {isMyOwe && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => onPay && onPay(s)}
                  >
                    Pay
                  </Button>
                )}
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      ) : (
        <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
          <span style={{ fontSize: "1.2rem" }}>🎉</span>
          <span>All settled up! No outstanding balances.</span>
        </Alert>
      )}
    </div>
  );
}
