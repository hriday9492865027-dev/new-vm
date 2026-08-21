/**
 * Auth Manager
 * Handles login, session management, and redirection.
 */

const AUTH_KEY = "ems_session";

class Auth {
  static login(username, password, role, metadata = {}) {
    const uLower = String(username || "").trim().toLowerCase();
    const pTrim = String(password || "").trim();
    const isAdminPass = pTrim === "admin123" || pTrim.toLowerCase() === "admin" || pTrim === "ADMIN";

    // Mock Validation
    if (role === "admin") {
      if (uLower === "admin" && isAdminPass) {
        const session = {
          id: "admin_01",
          name: "Administrator",
          role: "admin",
          timestamp: Date.now(),
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return { success: true, role: "admin" };
      } else {
        return { success: false, message: "Invalid admin credentials. Default is admin / admin123" };
      }
    } else {
      // Student Login fallback for admin
      if (uLower === "admin" && isAdminPass) {
        const session = {
          id: "admin_01",
          name: "Administrator",
          role: "admin", // Maintain admin privileges
          timestamp: Date.now(),
        };
        localStorage.setItem(AUTH_KEY, JSON.stringify(session));
        return { success: true, role: "admin" };
      }

      // Strict Validated Login against Admin Uploaded Data
      const usersDB = JSON.parse(localStorage.getItem("ems_users_db") || "{}");
      const student = usersDB[username];

      if (student) {
        if (String(student.password) === String(password)) {
          const session = {
            id: student.id,
            name: student.name,
            role: "student",
            branch: student.branch || "General",
            year: student.year || "1",
            batch: student.batch || "",
            timestamp: Date.now(),
          };
          localStorage.setItem(AUTH_KEY, JSON.stringify(session));
          return { success: true };
        } else {
          return { success: false, message: "Invalid password" };
        }
      } else {
        return {
          success: false,
          message: "Student ID not found. Contact Admin.",
        };
      }
    }
  }

  static logout() {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = "../index.html";
  }

  static checkSession() {
    const sessionStr = localStorage.getItem(AUTH_KEY);
    if (!sessionStr) return null;
    return JSON.parse(sessionStr);
  }

  static requireRole(role) {
    const session = this.checkSession();
    if (!session || session.role !== role) {
      // Redirect to login if invalid
      // Handle relative paths - for local development, we might be in a subdir
      // We'll rely on relative navigation usually, but for security redirects:
      const path = window.location.pathname;
      if (
        !path.includes("index.html") &&
        path !== "/" &&
        !path.endsWith("vignan/")
      ) {
        window.location.href = "../index.html";
      }
      return false;
    }
    return session;
  }
}

// Global Login Handler (used by index.html)
function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const role = window.currentRole || "student";
  let metadata = {};

  if (role === "student") {
    const sectionEl = document.getElementById("loginSection");
    const branchEl = document.getElementById("loginBranch");
    if (sectionEl) metadata.section = sectionEl.value.trim();
    if (branchEl) metadata.branch = branchEl.value;
    const batchEl = document.getElementById('loginBatch');
    if (batchEl) metadata.batch = batchEl.value;
  }

  // Pass metadata to login
  const result = Auth.login(username, password, role, metadata);

  if (result.success) {
    if (role === "admin" || result.role === "admin") {
      window.location.href = "admin/index.html";
    } else {
      window.location.href = "student/index.html";
    }
  } else {
    alert(result.message);
    // Clear inputs on failure
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
  }
}

// Expose to window for global access
window.Auth = Auth;
