import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Home from "./pages/DashboardHome";
import FindParking from "./pages/Home";
import Offers from "./pages/Offers";
import OfferDetails from "./pages/OfferDetails";
import Booking from "./pages/Booking";
import EnRoute from "./pages/EnRoute";
import Validation from "./pages/Validation";
import Session from "./pages/Session";
import Receipt from "./pages/Receipt";
import Profile from "./pages/Profile";
import History from "./pages/History";
import Payments from "./pages/Payments";
import Preferences from "./pages/Preferences";
import NotFound from "./pages/NotFound";
import Incidents from "./pages/Incidents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/home" element={<Home />} />
          <Route path="/booking" element={<FindParking />} />
          <Route path="/offers" element={<Offers />} />
          <Route path="/offer/:id" element={<OfferDetails />} />
          <Route path="/booking/:id/:type" element={<Booking />} />
          <Route path="/en-route" element={<EnRoute />} />
          <Route path="/validation" element={<Validation />} />
          <Route path="/session" element={<Session />} />
          <Route path="/receipt" element={<Receipt />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/history" element={<History />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/incidents" element={<Incidents />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
