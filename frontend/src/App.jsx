import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Generate from './pages/Generate';
import InvoiceHistory from './pages/InvoiceHistory';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Attendance from './pages/Attendance';
import StudentAttendance from './pages/StudentAttendance';
import ReportCards from './pages/ReportCards';
import ReportCardEdit from './pages/ReportCardEdit';

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/students"
          element={
            <ProtectedRoute>
              <Layout>
                <Students />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/generate"
          element={
            <ProtectedRoute>
              <Layout>
                <Generate />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <InvoiceHistory />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <Layout>
                <Help />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Layout><Attendance /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance/student/:studentId"
          element={
            <ProtectedRoute>
              <Layout><StudentAttendance /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-cards"
          element={
            <ProtectedRoute>
              <Layout><ReportCards /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/report-cards/:id/edit"
          element={
            <ProtectedRoute>
              <Layout><ReportCardEdit /></Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
