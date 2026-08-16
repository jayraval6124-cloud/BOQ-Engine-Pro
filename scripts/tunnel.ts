import localtunnel from "localtunnel";

async function startTunnel() {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log(`Your url is: ${tunnel.url}`);

    tunnel.on("close", () => {
      console.log("Tunnel closed");
    });
    tunnel.on("error", (err) => {
      console.error("Tunnel error", err);
    });
  } catch (err) {
    console.error(err);
  }
}

startTunnel();
