import { createBrowserRouter, Navigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import DocumentsPage from "../features/documents/pages/DocumentsPage";
import DocumentWorkspacePage from "../features/documents/pages/DocumentWorkspacePage";
import FlashcardsPage from "../features/flashcards/pages/FlashcardsPage";
import ProfilePage from "../features/profile/pages/ProfilePage";
import QuizAttemptPage from "../features/quizzes/pages/QuizAttemptPage";
import QuizResultsPage from "../features/quizzes/pages/QuizResultsPage";
import LoginPage from "../features/auth/pages/LoginPage";
import SignupPage from "../features/auth/pages/SignupPage";
import { ProtectedRoute, PublicOnlyRoute } from "../features/auth/components/AuthGuards";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>,
  },
  {
    path: "/signup",
    element: <PublicOnlyRoute><SignupPage /></PublicOnlyRoute>,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "documents", element: <DocumentsPage /> },
          { path: "documents/:documentId", element: <DocumentWorkspacePage /> },
          { path: "flashcards", element: <FlashcardsPage /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "quizzes/:quizId", element: <QuizAttemptPage /> },
          { path: "quizzes/:quizId/results", element: <QuizResultsPage /> },
        ],
      },
    ],
  },
]);

export default router;
