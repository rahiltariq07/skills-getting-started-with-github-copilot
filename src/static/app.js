document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  let messageTimeoutId;
  let latestActivitiesRequestId = 0;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    if (messageTimeoutId) {
      clearTimeout(messageTimeoutId);
    }

    // Hide message after 5 seconds
    messageTimeoutId = setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    const requestId = ++latestActivitiesRequestId;

    try {
      const response = await fetch(`/activities?t=${Date.now()}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const activities = await response.json();

      // Ignore stale responses that arrive out of order.
      if (requestId !== latestActivitiesRequestId) {
        return;
      }

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        const spotsLeft = details.max_participants - participants.length;
        const encodedActivityName = encodeURIComponent(name);
        const participantsMarkup = participants.length
          ? `<ul class="participants-list">${participants
              .map(
                (participant) => `<li class="participant-item">
                <span class="participant-email">${escapeHtml(participant)}</span>
                <button
                  type="button"
                  class="participant-delete-button"
                  data-activity="${encodedActivityName}"
                  data-email="${encodeURIComponent(participant)}"
                  aria-label="Unregister participant"
                  title="Unregister participant"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v9h-2V9zm4 0h2v9h-2V9zM7 9h2v9H7V9z" />
                  </svg>
                </button>
              </li>`
              )
              .join("")}</ul>`
          : '<p class="participants-empty">No one has signed up yet. Be the first!</p>';

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <div class="participants-header">
              <h5>Participants</h5>
              <span class="participants-count">${participants.length}</span>
            </div>
            ${participantsMarkup}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      if (requestId !== latestActivitiesRequestId) {
        return;
      }

      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  async function unregisterParticipant(activityName, email) {
    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/participants/${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
      } else {
        showMessage(result.detail || "Failed to unregister participant.", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        await fetchActivities();
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest(".participant-delete-button");
    if (!deleteButton) {
      return;
    }

    const activityName = decodeURIComponent(deleteButton.dataset.activity || "");
    const email = decodeURIComponent(deleteButton.dataset.email || "");

    if (!activityName || !email) {
      showMessage("Could not determine which participant to remove.", "error");
      return;
    }

    await unregisterParticipant(activityName, email);
  });

  // Initialize app
  fetchActivities();
});
