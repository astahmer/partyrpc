import { useEffect, useState } from "react";
import { usePartyRPC } from "./hooks/usePartyRPC";

function App() {
  const { sendEvent, usePartyMessage, useSocketEvent } = usePartyRPC();
  const [latencyMonitor, setLatencyMonitor] = useState<number | null>(null);
  const [counter, setCounter] = useState(0);
  const [latencyPingStarts, setLatencyPingStarts] = useState(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const id = crypto.randomUUID();
      latencyPingStarts.set(id, Date.now());
      sendEvent({ type: "latency", id });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useSocketEvent("open", () => {
    sendEvent({ type: "ping" });
  });

  usePartyMessage("latency", (data) => {
    const latency = Date.now() - latencyPingStarts.get(data.id);

    setLatencyPingStarts((latencyPingStarts) => {
      latencyPingStarts.delete(data.id);
      return latencyPingStarts;
    });
    setLatencyMonitor(latency);
  });

  usePartyMessage("counter", (data) => {
    setCounter(data.counter);
  });

  const handleAddToCounter = () => {
    sendEvent({ type: "add-to-counter", amount: 5 });
  };

  return (
    <>
      <button type="button" onClick={handleAddToCounter}>
        Add 5 to counter ({counter})
      </button>

      <div>{latencyMonitor !== null && `${latencyMonitor}ms`}</div>
    </>
  );
}

export default App;
