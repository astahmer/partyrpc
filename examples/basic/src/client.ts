import PartySocket from "partysocket";
import { ofetch } from "ofetch";
import { createPartyClient, createApiClient } from "partyrpc/client";
import { SafePartyEvents, SafePartyResponses, router } from "./safe-party";

declare const PARTYKIT_HOST: string;

const partySocket = new PartySocket({
  host: PARTYKIT_HOST,
  room: "some-room",
});
const client = createPartyClient<SafePartyEvents, SafePartyResponses>(partySocket, { debug: true });

const api = createApiClient(router.endpoints, (method, url, params) =>
  ofetch(url, {
    method,
    body: params?.body as any,
    headers: params?.header as any,
    query: params?.query as any,
  }),
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

const getCounter = document.createElement("button");
getCounter.setAttribute("type", "button");
getCounter.innerText = "Get counter";
getCounter.onclick = () => {
  api.get("/api/counter").then((res) => console.log(res));
};
Object.assign(getCounter.style, {
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
document.body.appendChild(getCounter);

const addToCounter = document.createElement("button");
addToCounter.setAttribute("type", "button");
addToCounter.innerText = "Add to counter";
addToCounter.onclick = () => {
  api.post("/api/counter", { body: { amount: 4 } }).then((res) => {
    res;
    // ^?
    return console.log(res);
  });
};
Object.assign(addToCounter.style, {
  position: "fixed",
  top: "0",
  left: "400px",
  width: "100px",
  height: "100px",
  "text-align": "center",
  background: "white",
  padding: "10px",
  zIndex: "9999",
});
document.body.appendChild(addToCounter);

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
