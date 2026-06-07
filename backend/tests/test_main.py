import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_client():
    response = client.post(
        "/clients/",
        json={"name": "Acme Corp", "industry": "Technology", "preferences": "Likes detailed reports"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Acme Corp"
    assert "id" in data

def test_organizational_memory():
    # 1. Create a client
    client_resp = client.post(
        "/clients/",
        json={"name": "Globex", "industry": "Manufacturing", "preferences": "Fast delivery"}
    )
    client_id = client_resp.json()["id"]

    # 2. Add a past successful proposal
    client.post(
        "/proposals/",
        json={
            "title": "Old Win",
            "content": "Our successful manufacturing process improvement plan.",
            "status": "won",
            "client_id": client_id
        }
    )

    # 3. Generate a new proposal
    gen_resp = client.post(
        "/generate-proposal/",
        json={"client_id": client_id, "topic": "New Factory Setup"}
    )
    assert gen_resp.status_code == 200
    data = gen_resp.json()
    assert data["memory_used"] is True
    assert "Old Win" in data["content"]
    assert "Globex" in data["content"]
