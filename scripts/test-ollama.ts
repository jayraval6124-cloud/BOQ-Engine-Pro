async function test() {
  try {
    const res = await fetch("http://localhost:11434/api/tags");
    const data = await res.json();
    console.log("Available models:", data.models.map((m: any) => m.name));
  } catch (e) {
    console.error("Ollama error:", e);
  }
}
test();
