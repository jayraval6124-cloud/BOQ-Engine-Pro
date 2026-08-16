async function main() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.AI_API_KEY || "AQ.Ab8RN6JYRk8GjHqdF7MStDwybMvd2n-L-Z2tYECn_hfXytALcA"}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.error) {
    console.error("Error:", data.error);
    return;
  }
  const models = data.models.map((m: any) => m.name);
  console.log("Available Models:", models);
}

main();
