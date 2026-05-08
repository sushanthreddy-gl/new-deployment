import { Navbar, Container, Button } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import { useNavigate } from "react-router-dom";

export default function Header() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <Navbar bg="white" variant="light" expand="md" sticky="top" className="shadow-sm border-bottom">
      <Container fluid="xl">
        <Navbar.Brand
          as={Link}
          to="/"
          style={{ fontWeight: 700, fontSize: "1.3rem" }}
        >
          💰 Bill Bloom
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" />

        <Navbar.Collapse id="main-nav">
          <div className="ms-auto d-flex align-items-center gap-2 mt-2 mt-md-0">
            {isAuthenticated ? (
              <>
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 36, height: 36, backgroundColor: "#e94560", color: "#fff", fontSize: 15 }}
                >
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <span className="text-dark small">{user?.username}</span>
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="ms-1"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  as={Link}
                  to="/login"
                  variant="outline-secondary"
                  size="sm"
                >
                  Login
                </Button>
                <Button
                  as={Link}
                  to="/register"
                  variant="danger"
                  size="sm"
                  style={{ backgroundColor: "#e94560", border: "none" }}
                >
                  Register
                </Button>
              </>
            )}
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
