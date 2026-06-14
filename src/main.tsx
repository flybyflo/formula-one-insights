import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import "./styles/dashboard.css"
import "./styles/qatar-timeline.css"
import "./styles/charts.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark">
      <App />
    </ThemeProvider>
  </StrictMode>
)
