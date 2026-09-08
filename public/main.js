const form = document.getElementById("greet-form");
const nameInput = document.getElementById("name");
const result = document.getElementById("result");
const healthDot = document.getElementById("health-dot");
const healthText = document.getElementById("health-text");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  result.textContent = "…";
  try {
    const params = new URLSearchParams({ name: nameInput.value });
    const res = await fetch(`/api/greet?${params}`);
    const data = await res.json();
    result.textContent = data.message;
  } catch (err) {
    result.textContent = "Request failed";
  }
});

async function checkHealth() {
  try {
    const res = await fetch("/api/health");
    const data = await res.json();
    if (data.status === "ok") {
      healthDot.classList.add("ok");
      healthText.textContent = `server healthy · up ${data.uptimeSeconds}s`;
      return;
    }
    throw new Error("unhealthy");
  } catch (err) {
    healthDot.classList.add("err");
    healthText.textContent = "server unreachable";
  }
}

checkHealth();
