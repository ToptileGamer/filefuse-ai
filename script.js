// Multi-step state
let currentStep = 1;
const totalSteps = 4;

document.addEventListener("DOMContentLoaded", () => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme init from localStorage
  const storedTheme = localStorage.getItem("filmfuse-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.body.setAttribute("data-theme", storedTheme);
    updateThemeToggleIcon(storedTheme);
  }

  // Theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.body.getAttribute("data-theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      document.body.setAttribute("data-theme", next);
      localStorage.setItem("filmfuse-theme", next);
      updateThemeToggleIcon(next);
    });
  }

  // Chips behaviour
  setupChipSelection();

  // Show first step with staggered animation
  showStep(currentStep);
});

/* ------------ THEME ICON ------------ */
function updateThemeToggleIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

/* ------------ CHIP SELECTION LOGIC ------------ */
function setupChipSelection() {
  document.querySelectorAll(".options").forEach(container => {
    const single = container.classList.contains("single-select");

    container.querySelectorAll(".chip").forEach(chip => {
      chip.addEventListener("click", () => {
        if (single) {
          // Only one can be active
          container.querySelectorAll(".chip").forEach(c =>
            c.classList.remove("selected")
          );
          chip.classList.add("selected");
        } else {
          chip.classList.toggle("selected");
        }
      });
    });
  });
}

/* ------------ MULTI-STEP WIZARD ------------ */
function showStep(step) {
  currentStep = step;

  // Toggle step visibility
  document.querySelectorAll(".form-step").forEach(stepEl => {
    const s = Number(stepEl.getAttribute("data-step"));
    stepEl.classList.toggle("active", s === step);
  });

  // Update dots
  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    const s = Number(dot.getAttribute("data-step-dot"));
    dot.classList.toggle("active", s === step);
  });

  // Step number
  const stepNumEl = document.getElementById("step-number");
  if (stepNumEl) stepNumEl.textContent = String(step);

  // Staggered field animation within this step
  const activeStep = document.querySelector(`.form-step[data-step="${step}"]`);
  if (activeStep) {
    const fields = activeStep.querySelectorAll(".field");
    fields.forEach((field, idx) => {
      field.classList.remove("visible");
      setTimeout(() => field.classList.add("visible"), idx * 180);
    });
  }

  // Scroll panel into view (mobile)
  const panel = document.getElementById("form-panel");
  if (panel) {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function nextStep() {
  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

/* ------------ SCROLL HELPERS ------------ */
function scrollToForm() {
  const panel = document.getElementById("form-panel");
  if (panel) {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToResults() {
  const section = document.getElementById("results");
  if (section) {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ------------ GROQ BACKEND CALL ------------ */
async function generateMovies() {
  // Helper to get selected chip values
  const getSelectedList = (id) => {
    const container = document.getElementById(id);
    if (!container) return [];
    return Array.from(container.querySelectorAll(".chip.selected")).map(c =>
      c.textContent.trim().toLowerCase()
    );
  };

  const languages = getSelectedList("langs");
  const genres = getSelectedList("genres");
  const moodList = getSelectedList("mood");
  const ageList = getSelectedList("age");

  const payload = {
    languages,
    genres,
    mood: moodList[0] || null,
    age: ageList[0] || null,
  };

  // Update summary pills above results
  const summary = document.getElementById("query-summary");
  if (summary) {
    summary.innerHTML = `
      <span class="query-pill">Lang: ${languages.length ? languages.join(", ") : "any"}</span>
      <span class="query-pill">Genres: ${genres.length ? genres.join(", ") : "any"}</span>
      <span class="query-pill">Mood: ${payload.mood || "any"}</span>
      <span class="query-pill">Age: ${payload.age || "any"}</span>
    `;
  }

  const movieList = document.getElementById("movieList");
  if (!movieList) return;

  // Show skeleton loaders
  movieList.innerHTML = createSkeletonHTML(3);

  try {
    const res = await fetch("http://localhost:4000/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || "Backend error");
    }

    const data = await res.json();
    const movies = data.movies || [];

    if (!movies.length) {
      movieList.innerHTML = `<p class="placeholder">No movies returned. Try adjusting your filters and generate again.</p>`;
      return;
    }

    // Render movie cards
    movieList.innerHTML = "";
    movies.forEach((movie) => {
      const card = document.createElement("div");
      card.className = "movie-card";
      card.innerHTML = `
        <div class="movie-content">
          <div class="movie-title">
            ${movie.title}
            ${movie.year ? `<span style="color:#9ca3af;"> (${movie.year})</span>` : ""}
          </div>
          <div class="movie-meta">
            ${(movie.language || "").toUpperCase()} · Rated ${movie.age_rating || "?"}
            ${movie.genres && movie.genres.length ? " · " + movie.genres.join(", ") : ""}
          </div>
          <div class="movie-desc">${movie.short_reason || ""}</div>
        </div>
      `;
      movieList.appendChild(card);
    });

    scrollToResults();
  } catch (err) {
    console.error(err);
    movieList.innerHTML = `<p class="placeholder" style="color:#ef4444;">Error: ${err.message}</p>`;
  }
}

/* ------------ SKELETON SHIMMER UI ------------ */
function createSkeletonHTML(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-lines">
          <div class="skeleton-line" style="width:70%;"></div>
          <div class="skeleton-line" style="width:55%;"></div>
          <div class="skeleton-line" style="width:90%;"></div>
        </div>
      </div>
    `;
  }
  return html;
}

/* ------------ EXPOSE FUNCTIONS TO HTML (onclick) ------------ */
window.scrollToForm = scrollToForm;
window.scrollToResults = scrollToResults;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.generateMovies = generateMovies;
