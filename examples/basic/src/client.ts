import PartySocket from "partysocket";
import { createPartyClient, createApiClient } from "partyrpc/client";
import { SafePartyEvents, SafePartyResponses, router } from "./safe-party";

declare const PARTYKIT_HOST: string;

const partySocket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "some-room",
});
const client = createPartyClient<SafePartyEvents, SafePartyResponses>(partySocket, { debug: true });
const api = createApiClient(router.endpoints, (method, url, params) =>
  fetch(url, { method }).then((res) => res.text()),
).setBaseUrl("http://127.0.0.1:1999");

const latencyPingStarts = new Map();

partySocket.onerror = (err) => console.error({ err });
partySocket.onclose = (evt) => console.log("closed", evt);
partySocket.onopen = () => client.send({ type: "ping" });

client.on("latency", (msg) => {
  const latency = Date.now() - latencyPingStarts.get(msg.id);
  latencyPingStarts.delete(msg.id);
  latencyMonitor.innerText = `${latency / 2}ms`;
});

client.on("pong", (msg) => {
  console.log("got pong", msg.size);
});

setInterval(() => {
  const id = crypto.randomUUID();
  latencyPingStarts.set(id, Date.now());
  client.send({ type: "latency", id });
}, 1000);

const btn = document.createElement("button");
btn.setAttribute("type", "button");
btn.innerText = "Add 5 to counter (0)";
btn.onclick = () => client.send({ type: "add-to-counter", amount: 5 });

client.on("counter", (msg) => {
  btn.innerText = `Add 5 to counter (${msg.counter})`;
});

Object.assign(btn.style, {
  position: "fixed",
  top: "0",
  left: "0",
  width: "100px",
  height: "100px",
  "text-align": "center",
  background: "white",
  padding: "10px",
  zIndex: "9999",
});
document.body.appendChild(btn);

const btn2 = document.createElement("button");
btn2.setAttribute("type", "button");
btn2.innerText = "Fetch /";
btn2.onclick = () => {
  api.post("/").then((res) => console.log(res));
};
Object.assign(btn2.style, {
  position: "fixed",
  top: "0",
  left: "200px",
  width: "100px",
  height: "100px",
  "text-align": "center",
  background: "white",
  padding: "10px",
  zIndex: "9999",
});
document.body.appendChild(btn2);

const latencyMonitor = document.createElement("div");
Object.assign(latencyMonitor.style, {
  position: "fixed",
  top: "0",
  right: "0",
  width: "100px",
  height: "100px",
  "text-align": "center",
  background: "white",
  padding: "10px",
  zIndex: "9999",
});

document.body.appendChild(latencyMonitor);
