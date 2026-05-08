import { useState, useRef, useEffect } from "react";
import { Form, Button, Card, Badge, Spinner } from "react-bootstrap";
import { searchUsers } from "../../services/userService";

export default function EditGroupForm({ group, onSubmit, onCancel }) {
  const [name, setName] = useState(group.name);
  const [newMembers, setNewMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const existingMemberIds = new Set(group.members.map((m) => m._id));

  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchUsers(q.trim());
        setSearchResults(
          (data.users || []).filter(
            (u) => !existingMemberIds.has(u._id) && !newMembers.find((m) => m._id === u._id)
          )
        );
        setDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const addMember = (user) => {
    setNewMembers((prev) => [...prev, user]);
    setSearch("");
    setSearchResults([]);
    setDropdownOpen(false);
  };

  const removeNewMember = (userId) => {
    setNewMembers((prev) => prev.filter((m) => m._id !== userId));
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Group name is required.";
    } else if (name.trim().length < 3) {
      newErrors.name = "Group name must be at least 3 characters.";
    }
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const payload = {
      name: name.trim(),
      addMemberIds: newMembers.map((m) => m._id),
    };
    onSubmit && onSubmit(payload);
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center border-bottom py-3">
        <h5 className="mb-0 fw-bold">Edit Group</h5>
        {onCancel && (
          <Button variant="outline-secondary" size="sm" onClick={onCancel}>x</Button>
        )}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="edit-group-name">
            <Form.Label className="fw-semibold">Group Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Current Members</Form.Label>
            <div className="d-flex flex-wrap gap-2">
              {group.members.map((m) => (
                <Badge
                  key={m._id}
                  bg="secondary"
                  className="d-flex align-items-center gap-1"
                  style={{ fontSize: 13 }}
                >
                  {m.username}
                </Badge>
              ))}
            </div>
          </Form.Group>

          {newMembers.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-2">
              <Form.Label className="w-100 fw-semibold mb-1">New Members to Add</Form.Label>
              {newMembers.map((m) => (
                <Badge
                  key={m._id}
                  bg="secondary"
                  className="d-flex align-items-center gap-1"
                  style={{ fontSize: 13, cursor: "pointer" }}
                  onClick={() => removeNewMember(m._id)}
                >
                  {m.username} &times;
                </Badge>
              ))}
            </div>
          )}

          <Form.Group className="mb-3 position-relative" ref={searchRef} controlId="edit-add-member">
            <Form.Label className="fw-semibold">Add New Members</Form.Label>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={handleSearchChange}
                autoComplete="off"
              />
              {searching && (
                <div className="position-absolute end-0 top-50 translate-middle-y pe-2">
                  <Spinner animation="border" size="sm" />
                </div>
              )}
            </div>
            {dropdownOpen && searchResults.length > 0 && (
              <div
                className="position-absolute w-100 bg-white border rounded shadow-sm"
                style={{ zIndex: 1050, maxHeight: 200, overflowY: "auto" }}
              >
                {searchResults.map((u) => (
                  <div
                    key={u._id}
                    className="px-3 py-2 d-flex align-items-center gap-2"
                    style={{ cursor: "pointer" }}
                    onMouseDown={() => addMember(u)}
                  >
                    <div
                      className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 30, height: 30, backgroundColor: "#e94560", fontSize: 14 }}
                    >
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="fw-semibold" style={{ fontSize: 14 }}>{u.username}</div>
                      <div className="text-muted" style={{ fontSize: 12 }}>{u.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Form.Group>

          <div className="d-flex gap-2 mt-3">
            <Button
              type="submit"
              style={{ backgroundColor: "#e94560", border: "none" }}
            >
              Save Changes
            </Button>
            {onCancel && (
              <Button variant="outline-secondary" onClick={onCancel}>Cancel</Button>
            )}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}
