import { useEffect, useState } from "react";
import { usePartyMessage, useSocketEvent, client } from "./hooks/safe-party-client";

function App() {
  const [latencyMonitor, setLatencyMonitor] = useState<number>(0);
  const [counter, setCounter] = useState(0);
  const [latencyPingStarts, setLatencyPingStarts] = useState(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const id = crypto.randomUUID();
      latencyPingStarts.set(id, Date.now());

      client.send({ type: "latency", id });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useSocketEvent("open", () => {
    client.send({ type: "ping" });
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
    client.send({ type: "add-to-counter", amount: 5 });
  };

  return (
    <>
      <button type="button" onClick={handleAddToCounter}>
        Add 5 to counter ({counter})
      </button>

      <div>{latencyMonitor}ms</div>
    </>
  );
}

export default App;
