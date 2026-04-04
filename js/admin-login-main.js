import { ensureAdminSession, redirectAfterLogin } from "./admin-auth.js";

const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("adminLoginStatus");

const showStatus = (message) => {
  loginStatus.textContent = message;
};

const initializeLogin = async () => {
  const authenticated = await ensureAdminSession();

  if (authenticated) {
    redirectAfterLogin();
    return;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("Signing in...");

    const formData = new FormData(loginForm);
    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not sign in.");
      }

      showStatus(result.message);
      redirectAfterLogin();
    } catch (error) {
      showStatus(error.message);
    }
  });
};

initializeLogin();
