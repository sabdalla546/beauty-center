import React from "react";
import AppRouter from "./router.tsx";
import Loader from "@/components/common/Loader";
import { Toaster } from "@/components/ui/toaster";

function App() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: number | undefined;

    const markReady = () => {
      timeoutId = window.setTimeout(() => setIsReady(true), 250);
    };

    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
    }

    return () => {
      window.removeEventListener("load", markReady);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!isReady) return <Loader />;

  return (
    <>
      <AppRouter />
      <Toaster />
    </>
  );
}

export default App;
