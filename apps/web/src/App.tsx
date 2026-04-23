import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import AboutPage from "@/pages/AboutPage";
import EventDetailPage from "@/pages/EventDetailPage";
import EventsPage from "@/pages/EventsPage";
import LoginPage from "@/pages/LoginPage";
import MyAssessmentReviewsPage from "@/pages/MyAssessmentReviewsPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import ReputationPage from "@/pages/ReputationPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<EventsPage />} />
        <Route path="/reputation" element={<ReputationPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/reviews" element={<MyAssessmentReviewsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
      </Route>
    </Routes>
  );
}
