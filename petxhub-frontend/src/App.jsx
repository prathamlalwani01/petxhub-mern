import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";
import Pets from "./pages/Pets"
import Services from "./pages/Service";
import VetBooking from "./pages/VetBooking";
import ManageBookings from "./pages/ManageBookings";
import MyBookings from "./pages/MyBooking";
import HealthRecords from "./pages/HealthRecords";
import Adoptions from "./pages/Adoptions";
import AdoptionRequests from "./pages/AdoptionRequests";
import ProfileSettings from "./pages/ProfileSettings";
import Notifications from "./pages/Notifications";
import AdminBookingSettings from "./pages/AdminBookingSettings";
import BookingReceipt from "./pages/BookingReceipt";
import AIPetAssistant from "./pages/AIPetAssistant";
import AdminAnalytics from "./pages/AdminAnalytics";
import ProviderWorkspace from "./pages/ProviderWorkspace";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import AdminContactMessages from "./pages/AdminContactMessages";
import AdminUsers from "./pages/AdminUsers";
import Footer from "./components/Footer";
import PopupMessageCenter from "./components/PopupMessageCenter";
import ScrollToTopButton from "./components/ScrollToTopButton";
import "./App.css";

function AppContent() {
  const location = useLocation();
  const hideFooter = false;

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/contact-us" element={<ContactUs />} />
        <Route path="/admin-contact-messages" element={
          <ProtectedRoute>
            <AdminContactMessages />
          </ProtectedRoute>
        } />
        <Route path="/admin-users" element={
          <ProtectedRoute>
            <AdminUsers />
          </ProtectedRoute>
        } />
        <Route path="/pets" element={
          <ProtectedRoute>
            <Pets></Pets>
          </ProtectedRoute>
        } />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <Services />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vet-booking"
          element={
            <ProtectedRoute>
              <VetBooking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grooming"
          element={
            <ProtectedRoute>
              <Navigate to="/services" replace />
            </ProtectedRoute>
          }
        />
        <Route path="/my-bookings" element={
          <ProtectedRoute>
            <MyBookings />
          </ProtectedRoute>
        } />
        <Route path="/manage-bookings" element={
          <ProtectedRoute>
            <ManageBookings />
          </ProtectedRoute>
        } />
        <Route path="/health-records" element={
          <ProtectedRoute>
            <HealthRecords />
          </ProtectedRoute>
        } />
        <Route path="/adoptions" element={
          <ProtectedRoute>
            <Adoptions />
          </ProtectedRoute>
        } />
        <Route path="/adoption-requests" element={
          <ProtectedRoute>
            <AdoptionRequests />
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <ProfileSettings />
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        } />
        <Route path="/booking-settings" element={
          <ProtectedRoute>
            <AdminBookingSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin-analytics" element={
          <ProtectedRoute>
            <AdminAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/provider-workspace" element={
          <ProtectedRoute>
            <ProviderWorkspace />
          </ProtectedRoute>
        } />
        <Route path="/bookings/:id/receipt" element={
          <ProtectedRoute>
            <BookingReceipt />
          </ProtectedRoute>
        } />
        <Route path="/ai-pet-assistant" element={
          <ProtectedRoute>
            <AIPetAssistant />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <PopupMessageCenter />
      <ScrollToTopButton />
      {!hideFooter && <Footer key={location.pathname} />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
