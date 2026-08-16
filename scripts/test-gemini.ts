async function test() {
  try {
    const apiKey = "AQ.Ab8RN6IrU4Z9wExEQs6QxemR_eUeW2qYR63AXgzl12u-NlsPnw";
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.error("Fetch Error:", error.message);
  }
}
test();
