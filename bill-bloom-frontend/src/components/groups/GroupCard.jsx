import { Card, Badge, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const BG_COLORS = ["#e94560", "#4ecdc4", "#a29bfe", "#fdcb6e", "#6c5ce7", "#00b894"];

export default function GroupCard({ group, onEdit, onDelete }) {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const creator = group.createdBy;
  const isCreator = user && creator && user.id === creator._id;
  const colorIndex = group._id.charCodeAt(group._id.length - 1) % BG_COLORS.length;
  const cardColor = BG_COLORS[colorIndex];

  return (
    <Card className="h-100 shadow-sm border-0 position-relative" style={{ borderTop: `4px solid ${cardColor}` }}>
      {isCreator && (
        <div className="position-absolute d-flex gap-1" style={{ top: 10, right: 10, zIndex: 1 }}>
          <button
            className="btn btn-sm btn-light p-1 lh-1"
            onClick={() => onEdit && onEdit(group)}
            title="Edit group"
            style={{ lineHeight: 1 }}
          >
            <i className="bi bi-pencil" style={{ fontSize: 15, color: '#555' }}></i>
          </button>
          <button
            className="btn btn-sm btn-light p-1 lh-1"
            onClick={() => onDelete && onDelete(group)}
            title="Delete group"
            style={{ lineHeight: 1 }}
          >
            <i className="bi bi-trash" style={{ fontSize: 15, color: '#e94560' }}></i>
          </button>
        </div>
      )}
      <Card.Body className="d-flex flex-column p-3">
        <div className="d-flex align-items-center gap-3 mb-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
            style={{ width: 48, height: 48, backgroundColor: cardColor, fontSize: 20, flexShrink: 0 }}
          >
            {group.name.charAt(0).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <Card.Title className="mb-0 text-truncate fw-bold" style={{ fontSize: "1rem" }}>
              {group.name}
            </Card.Title>
            <small className="text-muted">
              by <span className="fw-semibold">{creator ? creator.username : "Unknown"}</span>
            </small>
          </div>
        </div>

        <div className="d-flex gap-2 mb-3">
          <Badge bg="light" text="dark" className="border">
            👥 {group.members.length} members
          </Badge>
          <Badge bg="light" text="dark" className="border">
            📅 {new Date(group.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </Badge>
        </div>

        <div className="d-flex gap-1 mb-3">
          {group.members.slice(0, 5).map((member) => (
            <div
              key={member._id}
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-semibold"
              style={{ width: 32, height: 32, backgroundColor: "#1a1a2e", fontSize: 12, flexShrink: 0 }}
              title={member.username}
            >
              {member.username.charAt(0).toUpperCase()}
            </div>
          ))}
          {group.members.length > 5 && (
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-semibold"
              style={{ width: 32, height: 32, backgroundColor: "#aaa", fontSize: 11 }}
            >
              +{group.members.length - 5}
            </div>
          )}
        </div>

        <div className="d-flex gap-2 mt-auto">
          <Button
            size="sm"
            style={{ backgroundColor: "#e94560", border: "none", flex: 1 }}
            onClick={() => navigate(`/groups/${group._id}`)}
          >
            Open
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
