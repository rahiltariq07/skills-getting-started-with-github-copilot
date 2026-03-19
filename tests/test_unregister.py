from urllib.parse import quote


def test_unregister_success_removes_participant(client):
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    response = client.delete(
        f"/activities/{quote(activity_name, safe='')}/participants/{quote(email, safe='')}"
    )

    assert response.status_code == 200
    assert response.json()["message"] == f"Unregistered {email} from {activity_name}"

    activities_response = client.get("/activities")
    assert activities_response.status_code == 200
    assert email not in activities_response.json()[activity_name]["participants"]


def test_unregister_unknown_activity_returns_404(client):
    response = client.delete(
        f"/activities/{quote('Nonexistent Club', safe='')}/participants/{quote('student@mergington.edu', safe='')}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_not_enrolled_returns_404(client):
    response = client.delete(
        f"/activities/{quote('Chess Club', safe='')}/participants/{quote('notenrolled@mergington.edu', safe='')}"
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"
