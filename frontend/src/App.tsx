import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import api from "./services/api";
import Dashboard from "./pages/Dashboard";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const WARNING_TIMEOUT_MS = 60 * 1000;

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("accessToken") ?? "",
  );

  const [userRole, setUserRole] = useState(
    () => localStorage.getItem("userRole") ?? "",
  );

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60);

  const handleLogout = useCallback(() => {
    void api.post("/auth/logout").catch(() => undefined);

    localStorage.removeItem("accessToken");
    localStorage.removeItem("userRole");

    setToken("");
    setUserRole("");
    setPassword("");
    setWarningOpen(false);
    setRemainingSeconds(60);
    setError("");
  }, []);

  // Log out if the API cannot refresh an expired access token.
  useEffect(() => {
    const handleSessionExpired = () => handleLogout();

    window.addEventListener("auth:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, [handleLogout]);

  // Start the inactivity timer while the user is logged in.
  useEffect(() => {
    if (!token || !userRole || warningOpen) {
      return;
    }

    let idleTimer: ReturnType<typeof setTimeout>;

    const startIdleTimer = () => {
      clearTimeout(idleTimer);

      idleTimer = setTimeout(() => {
        setRemainingSeconds(60);
        setWarningOpen(true);
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, startIdleTimer);
    });

    startIdleTimer();

    return () => {
      clearTimeout(idleTimer);

      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, startIdleTimer);
      });
    };
  }, [token, userRole, warningOpen]);

  // Automatically log out if the user ignores the warning.
  useEffect(() => {
    if (!warningOpen) {
      return;
    }

    setRemainingSeconds(60);

    const countdown = setInterval(() => {
      setRemainingSeconds((previous) => Math.max(previous - 1, 0));
    }, 1000);

    const logoutTimer = setTimeout(() => {
      handleLogout();
    }, WARNING_TIMEOUT_MS);

    return () => {
      clearInterval(countdown);
      clearTimeout(logoutTimer);
    };
  }, [warningOpen, handleLogout]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const accessToken = response.data.accessToken;
      const role = response.data.user?.role;

      if (
        typeof accessToken !== "string" ||
        !accessToken.trim() ||
        typeof role !== "string" ||
        !role.trim()
      ) {
        setError("Login response is missing a valid token or user role.");
        return;
      }

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userRole", role);

      setToken(accessToken);
      setUserRole(role);
      setWarningOpen(false);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;

        setError(
          Array.isArray(message)
            ? message.join(", ")
            : typeof message === "string"
              ? message
              : "Login failed. Check your credentials and backend.",
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStayLoggedIn = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/refresh");
      const newToken = response.data.accessToken;

      if (typeof newToken !== "string" || !newToken.trim()) {
        throw new Error("Refresh response has no access token.");
      }

      localStorage.setItem("accessToken", newToken);
      setToken(newToken);
      setWarningOpen(false);
    } catch {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  if (token && userRole) {
    return (
      <>
        <Dashboard userRole={userRole} onLogout={handleLogout} />

        {warningOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-warning-title"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-600">
                !
              </div>

              <h2
                id="session-warning-title"
                className="mt-5 text-center text-xl font-bold text-slate-900"
              >
                Are you still there?
              </h2>

              <p className="mt-3 text-center text-sm leading-6 text-slate-500">
                You've been inactive for a while. Your session will end
                automatically unless you choose to continue.
              </p>

              <p
                className="mt-4 text-center text-sm font-semibold text-amber-700"
                aria-live="polite"
              >
                Logging out in {remainingSeconds} seconds
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Logout
                </button>

                <button
                  type="button"
                  onClick={handleStayLoggedIn}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Checking session..." : "Stay Logged In"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
            PO
          </div>

          <h1 className="text-3xl font-bold leading-tight text-slate-900">
            Purchase Order Management
          </h1>

          <p className="mt-3 text-slate-500">
            Sign in to manage your procurement
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure procurement management
        </p>
      </div>
    </div>
  );
}

export default App;
