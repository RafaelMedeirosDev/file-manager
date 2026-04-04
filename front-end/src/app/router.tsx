import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { FolderDetailsPage } from '../pages/FolderDetailsPage';
import { FoldersPage } from '../pages/FoldersPage';
import { HomeRedirectPage } from '../pages/HomeRedirectPage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';
import { CreateUserPage } from '../pages/CreateUserPage';
import { ExamRequestPage } from '../pages/ExamRequestPage';
import { ExamRequestsPage } from '../pages/ExamRequestsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomeRedirectPage /> },
          { path: '/folders', element: <FoldersPage /> },
          { path: '/folders/:id', element: <FolderDetailsPage /> },
          { path: '/files', element: <Navigate to="/folders" replace /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/users',            element: <UsersPage />       },
          { path: '/users/new',        element: <CreateUserPage />  },
          { path: '/exam-requests',     element: <ExamRequestsPage /> },
          { path: '/exam-requests/new', element: <ExamRequestPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
