import { NavLink } from "react-router-dom";
import { Nav, Container } from "react-bootstrap";

const NAV_ITEMS = [
  { to: "/", label: "Home", end: true },
  { to: "/groups", label: "Groups" },
  { to: "/expenses", label: "Personal" },
  { to: "/analytics", label: "Analytics" },
];

export default function NavLinks() {
  return (
    <div className="bg-white border-bottom mt-3">
      <Container fluid="xl">
        <Nav variant="tabs" className="border-bottom-0">
          {NAV_ITEMS.map((item) => (
            <Nav.Item key={item.to}>
              <Nav.Link
                as={NavLink}
                to={item.to}
                end={item.end}
                className={({ isActive }) => isActive ? "fw-bold" : ""}
              >
                {item.label}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </Container>
    </div>
  );
}
