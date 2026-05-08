import { Container, Row, Col } from "react-bootstrap";
import { useParams, Navigate } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";
import { useSelector } from "react-redux";

export default function AuthPage({ page }) {
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={7} lg={5}>
          {page === "login" ? <LoginForm /> : <RegisterForm />}
        </Col>
      </Row>
    </Container>
  );
}
