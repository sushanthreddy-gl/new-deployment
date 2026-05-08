import { Container } from "react-bootstrap";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ backgroundColor: "#1a1a2e", color: "#aaa", marginTop: "auto" }}>
      <Container className="py-3 text-center">
        <p className="mb-1 fw-semibold" style={{ color: "#e94560" }}>
          💰 Bill Bloom — Split smarter, stress less.
        </p>
        <p className="mb-0 small">&copy; {year} Bill Bloom. All rights reserved.</p>
      </Container>
    </footer>
  );
}
