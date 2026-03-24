import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './guards/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { FilesPage } from '../pages/FilesPage';
import { FolderDetailsPage } from '../pages/FolderDetailsPage';
import { FoldersPage } from '../pages/FoldersPage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';

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
          { path: '/', element: <DashboardPage /> },
          { path: '/folders', element: <FoldersPage /> },
          { path: '/folders/:id', element: <FolderDetailsPage /> },
          { path: '/files', element: <FilesPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['ADMIN']} />,
    children: [
      {
        element: <AppLayout />,
        children: [{ path: '/users', element: <UsersPage /> }],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
