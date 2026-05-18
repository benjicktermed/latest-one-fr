import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function ProtectedHome() {
  const { isLoggedIn } = useApp();
  if (!isLoggedIn) return <Redirect to="/login" />;
  return <Home />;
}

function GuestOnly() {
  const { isLoggedIn } = useApp();
  if (isLoggedIn) return <Redirect to="/" />;
  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ProtectedHome} />
      <Route path="/login" component={GuestOnly} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AppProvider>
    </QueryClientProvider>
  );
}

export default App;
