import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import Module1 from "./pages/Module1";
import Module2 from "./pages/Module2";
import Module3 from "./pages/Module3";
import Module4 from "./pages/Module4";
import Module5 from "./pages/Module5";
import CaptureSession from "./pages/CaptureSession";
import PlanDocument from "./pages/PlanDocument";

export const router = createBrowserRouter([
  {
    path: "/plan-document",
    Component: PlanDocument,
  },
  {
    path: "/capture/:sessionId",
    Component: CaptureSession,
  },
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Module1 },
      { path: "cloud", Component: Module2 },
      { path: "ai-brain", Component: Module3 },
      { path: "twin", Component: Module4 },
      { path: "market", Component: Module5 },
    ],
  },
]);
