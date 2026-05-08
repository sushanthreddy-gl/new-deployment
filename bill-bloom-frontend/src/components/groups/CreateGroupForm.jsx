import { useState, useRef, useEffect } from "react";
import { Form, Button, Card, Badge, Spinner } from "react-bootstrap";
import { searchUsers } from "../../services/userService";

export default function CreateGroupForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [errors, setErrors] = useState({});
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

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
        setSearchResults((data.users || []).filter((u) => !selectedMembers.find((m) => m._id === u._id)));
        setDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const addMember = (user) => {
    setSelectedMembers((prev) => [...prev, user]);
    if (errors.members) setErrors((prev) => ({ ...prev, members: "" }));
    setSearch("");
    setSearchResults([]);
    setDropdownOpen(false);
  };

  const removeMember = (userId) => {
    setSelectedMembers((prev) => prev.filter((m) => m._id !== userId));
  };

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Group name is required.";
    } else if (name.trim().length < 3) {
      newErrors.name = "Group name must be at least 3 characters.";
    }
    if (selectedMembers.length < 1) {
      newErrors.members = "Please select at least one member.";
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
    const payload = { name: name.trim(), memberIds: selectedMembers.map((m) => m._id) };
    onSubmit && onSubmit(payload);
    setName("");
    setSelectedMembers([]);
    setErrors({});
  };

  return (
    <Card className="shadow-sm border-0">
      <Card.Header className="bg-white d-flex justify-content-between align-items-center border-bottom py-3">
        <h5 className="mb-0 fw-bold">Create New Group</h5>
        {onCancel && (
          <Button variant="outline-secondary" size="sm" onClick={onCancel}>x</Button>
        )}
      </Card.Header>
      <Card.Body className="p-4">
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="group-name">
            <Form.Label className="fw-semibold">Group Name</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="e.g. Goa Trip 2025"
              isInvalid={!!errors.name}
            />
            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
          </Form.Group>

          {selectedMembers.length > 0 && (
            <div className="mb-2 d-flex flex-wrap gap-2">
              {selectedMembers.map((m) => (
                <Badge
                  key={m._id}
                  bg="secondary"
                  className="d-flex align-items-center gap-1"
                  style={{ fontSize: 13, cursor: "pointer" }}
                  onClick={() => removeMember(m._id)}
                >
                  {m.username} x
                </Badge>
              ))}
            </div>
          )}

          <Form.Group className="mb-3" controlId="member-search">
            <Form.Label className="fw-semibold">Add Members</Form.Label>
            <div className="position-relative" ref={searchRef}>
              <Form.Control
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by username..."
                isInvalid={!!errors.members}
                autoComplete="off"
              />
              {searching && (
                <Spinner
                  size="sm"
                  animation="border"
                  className="position-absolute"
                  style={{ right: 10, top: 10 }}
                />
              )}
              <Form.Control.Feedback type="invalid">{errors.members}</Form.Control.Feedback>
              {dropdownOpen && searchResults.length > 0 && (
                <div
                  className="border rounded bg-white shadow-sm position-absolute w-100"
                  style={{ zIndex: 1000, maxHeight: 200, overflowY: "auto" }}
                >
                  {searchResults.map((u) => (
                    <div
                      key={u._id}
                      className="px-3 py-2"
                      style={{ cursor: "pointer" }}
                      onMouseDown={() => addMember(u)}
                    >
                      {u.username}
                      <small className="text-muted ms-2">{u.email}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Group>

          <div className="d-flex gap-2 mt-4">
            <Button type="submit" style={{ backgroundColor: "#e94560", border: "none" }}>
              Create Group
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

