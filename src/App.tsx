import { AppProvider, useApp } from "@/lib/AppContext";
import { IntakeScreen } from "@/components/intake/IntakeScreen";
import { ProcessingScreen } from "@/components/intake/ProcessingScreen";
import { ResultScreen } from "@/components/result/ResultScreen";
import { CrisisScreen } from "@/components/result/CrisisScreen";
import { HandoffScreen } from "@/components/result/HandoffScreen";
import { StaffLogin } from "@/components/staff/StaffLogin";
import { StaffQueue } from "@/components/staff/StaffQueue";
import { StaffView } from "@/components/staff/StaffView";

function AppRouter() {
  const { screen } = useApp();

  switch (screen) {
    case "intake":       return <IntakeScreen />;
    case "processing":   return <ProcessingScreen />;
    case "crisis":       return <CrisisScreen />;
    case "result":       return <ResultScreen />;
    case "handoff":      return <HandoffScreen />;
    case "staff-login":  return <StaffLogin />;
    case "queue":        return <StaffQueue />;
    case "staff":        return <StaffView />;
    default:             return <IntakeScreen />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}
