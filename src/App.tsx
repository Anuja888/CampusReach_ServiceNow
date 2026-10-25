import { AppProvider, useApp } from "@/lib/AppContext";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { IntakeScreen } from "@/components/intake/IntakeScreen";
import { ProcessingScreen } from "@/components/intake/ProcessingScreen";
import { ResultScreen } from "@/components/result/ResultScreen";
import { CrisisScreen } from "@/components/result/CrisisScreen";
import { HandoffScreen } from "@/components/result/HandoffScreen";
import { MyRequests } from "@/components/student/MyRequests";
import { StaffQueue } from "@/components/staff/StaffQueue";
import { StaffView } from "@/components/staff/StaffView";
import { AdminInsights } from "@/components/admin/AdminInsights";
import { InactivityGuard } from "@/components/shared/InactivityDialog";
import { ChatWidget } from "@/components/chat/ChatWidget";

function AppRouter() {
  const { screen } = useApp();

  switch (screen) {
    case "landing":
    case "staff-login":   // legacy redirect
      return <LoginScreen />;
    case "intake":        return <IntakeScreen />;
    case "processing":    return <ProcessingScreen />;
    case "crisis":        return <CrisisScreen />;
    case "result":        return <ResultScreen />;
    case "handoff":       return <HandoffScreen />;
    case "my-requests":
    case "request-detail":
      return <MyRequests />;
    case "queue":         return <StaffQueue />;
    case "staff":         return <StaffView />;
    case "admin":         return <AdminInsights />;
    default:              return <LoginScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <InactivityGuard />
      <AppRouter />
      <ChatWidget />
    </AppProvider>
  );
}
