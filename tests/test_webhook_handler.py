import pytest
from gpt_cursor_runner.main import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_webhook_handler_creates_patch_file(client, tmp_path, monkeypatch):
    # Patch process_hybrid_block to write to tmp_path
    from gpt_cursor_runner import webhook_handler
    monkeypatch.setattr(webhook_handler, "process_hybrid_block", lambda data: str(tmp_path / "patch.json"))
    payload = {
        "id": "test-id",
        "role": "test-role",
        "patch": {"pattern": "foo", "replacement": "bar"}
    }
    response = client.post("/webhook", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert "saved" in data 