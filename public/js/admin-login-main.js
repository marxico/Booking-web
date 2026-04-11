import { ensureAdminSession, redirectAfterLogin } from "./admin-auth.js";
import { installClientLogging, logClientError, logClientInfo } from "./client-logger.js";
import { validateAdminIdentifier, validateLoginPassword } from "./validation.js";

const loginForm = document.getElementById("adminLoginForm");
const loginStatus = document.getElementById("adminLoginStatus");
const googleWrap = document.getElementById("googleLoginSection");
const googleDivider = document.getElementById("googleLoginDivider");
const googleButton = document.getElementById("googleLoginButton");
const googleHint = document.getElementById("googleLoginHint");

const showStatus = (message) => {
  loginStatus.textContent = message;
};

const handleGoogleCredential = async (credential) => {
  showStatus("Signing in with Google...");

  try {
    const response = await fetch("/admin/login/google", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ credential })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Could not sign in with Google.");
    }

    showStatus(result.message);
    redirectAfterLogin();
  } catch (error) {
    showStatus(error.message);
  }
};

const initializeGoogleLogin = (clientId) => {
  if (!window.google?.accounts?.id) {
    googleHint.textContent = "Google sign-in script did not load.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: ({ credential }) => handleGoogleCredential(credential)
  });

  window.google.accounts.id.renderButton(googleButton, {
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "signin_with",
    width: 320
  });

  googleHint.textContent = "Allowed Google accounts can enter here.";
};

const initializeLogin = async () => {
  installClientLogging("admin-login");
  const session = await ensureAdminSession();

  if (session.authenticated) {
    redirectAfterLogin();
    return;
  }

  if (session.auth?.googleEnabled && session.auth?.googleClientId) {
    googleWrap.hidden = false;
    googleDivider.hidden = false;
    initializeGoogleLogin(session.auth.googleClientId);
  } else {
    googleWrap.hidden = false;
    googleDivider.hidden = false;
    googleButton.innerHTML = "";
    googleHint.textContent = "Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID on the server and allow an admin user with Google or hybrid access.";
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showStatus("Signing in...");

    const formData = new FormData(loginForm);
    const username = formData.get("username");
    const password = formData.get("password");

    try {
      validateAdminIdentifier(username);
      validateLoginPassword(password);
      logClientInfo("admin-login-attempt");

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
      logClientInfo("admin-login-success", result.message);
      redirectAfterLogin();
    } catch (error) {
      logClientError("admin-login-failed", error.message);
      showStatus(error.message);
    }
  });
};

initializeLogin();
