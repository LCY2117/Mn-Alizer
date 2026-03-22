import { RouterProvider } from "react-router";
import { DemoProvider } from "./context/DemoContext";
import { router } from "./routes";

export default function App() {
  return (
    <DemoProvider>
      <RouterProvider router={router} />
    </DemoProvider>
  );
}
