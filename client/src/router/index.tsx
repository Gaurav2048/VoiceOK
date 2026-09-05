// App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GoogleCallback from "../GoogleCallback";
import App from "../App";


export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/auth/google/callback"
          element={<GoogleCallback />}
        />
      </Routes>
    </BrowserRouter>
  );
}