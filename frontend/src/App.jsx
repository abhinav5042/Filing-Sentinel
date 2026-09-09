import { useState } from "react";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import SummaryPage from "./pages/SummaryPage";
import DiffPage from "./pages/DiffPage";
import FinancialsPage from "./pages/FinancialsPage";
import MemosPage from "./pages/MemosPage";
import AlertsPage from "./pages/AlertsPage";
import AccountPage from "./pages/AccountPage";
import LandingPage from "./pages/LandingPage";
import PeerComparisonPage from "./pages/PeerComparisonPage";

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [view, setView] = useState("chat");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showPeerComparison, setShowPeerComparison] = useState(false);
  const [landingDismissed, setLandingDismissed] = useState(false);

  if (!isAuthenticated) {
    if (!landingDismissed) {
      return <LandingPage onGetStarted={() => setLandingDismissed(true)} />;
    }
    return <AuthPage />;
  }

  if (showAlerts) {
    return <AlertsPage onBackToHome={() => setShowAlerts(false)} />;
  }

  if (showAccount) {
    return <AccountPage onBackToHome={() => setShowAccount(false)} />;
  }

  if (showPeerComparison) {
    return <PeerComparisonPage onBackToHome={() => setShowPeerComparison(false)} />;
  }

  if (!selectedCompany) {
    return (
      <HomePage
        onSelectCompany={(company) => {
          setSelectedCompany(company);
          setPendingQuestion("");
          setView("chat");
        }}
        onQuickAction={(company, targetView) => {
          setSelectedCompany(company);
          setPendingQuestion("");
          setView(targetView);
        }}
        onStartFromQuestion={(company, question) => {
          setSelectedCompany(company);
          setPendingQuestion(question);
          setView("chat");
        }}
        onGoToAlerts={() => setShowAlerts(true)}
        onGoToAccount={() => setShowAccount(true)}
        onGoToPeerComparison={() => setShowPeerComparison(true)}
      />
    );
  }

  function backToHome() {
    setSelectedCompany(null);
  }

  if (view === "summary") {
    return (
      <SummaryPage
        company={selectedCompany}
        onBackToHome={backToHome}
        onGoToChat={() => setView("chat")}
        onGoToDiff={() => setView("diff")}
        onGoToFinancials={() => setView("financials")}
      />
    );
  }

  if (view === "diff") {
    return (
      <DiffPage
        company={selectedCompany}
        onBackToHome={backToHome}
        onGoToChat={() => setView("chat")}
        onGoToSummary={() => setView("summary")}
      />
    );
  }

  if (view === "financials") {
    return (
      <FinancialsPage
        company={selectedCompany}
        onBackToHome={backToHome}
        onGoToChat={() => setView("chat")}
        onGoToSummary={() => setView("summary")}
        onGoToDiff={() => setView("diff")}
      />
    );
  }

  if (view === "memos") {
    return (
      <MemosPage
        company={selectedCompany}
        onBackToHome={backToHome}
        onGoToChat={() => setView("chat")}
        onGoToSummary={() => setView("summary")}
        onGoToDiff={() => setView("diff")}
        onGoToFinancials={() => setView("financials")}
      />
    );
  }

  return (
    <ChatPage
      initialCompany={selectedCompany}
      initialQuestion={pendingQuestion}
      onBackToHome={backToHome}
      onGoToSummary={() => setView("summary")}
      onGoToDiff={() => setView("diff")}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
