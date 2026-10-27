// The home page's few moving parts: the drawn Add to cart buttons and the
// "one change, start to finish" walkthrough. Ported from Avery's React
// version; the page is complete without any of it.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The drawn card's button answers a click the way a shop's would, then goes
// back. It adds nothing anywhere: there is no cart on this page.
for (const btn of document.querySelectorAll("[data-cart]")) {
  btn.addEventListener("click", () => {
    btn.classList.add("rp-card-buy--added");
    btn.textContent = "Added";
    setTimeout(() => {
      btn.classList.remove("rp-card-buy--added");
      btn.textContent = "Add to cart";
    }, 1600);
  });
}

// Someone who has checked a store before goes straight back to its dashboard.
try {
  const last = localStorage.getItem("ql:lastStore");
  if (last) {
    const link = document.getElementById("nav-dashboard");
    link.href = `/dashboard?store=${encodeURIComponent(last)}`;
    link.textContent = "Your dashboard";
  }
} catch {
  // Storage blocked: the link stays pointing at the form.
}

// ---------- walkthrough ----------

const play = document.getElementById("play");
if (play) {
  // Long enough to read the side card before it moves on; matches the
  // progress bar's animation in home.css.
  const STEP_MS = 5000;
  const STEPS = 3;
  let step = 0;
  let playing = !reducedMotion;
  let inView = false;
  let timer;

  const q = (sel) => play.querySelector(sel);
  const toggle = q("[data-play-toggle]");

  function render() {
    play.dataset.step = String(step);
    play.classList.toggle("rp-play--running", running());
    for (const b of play.querySelectorAll(".rp-play-step")) {
      if (Number(b.dataset.go) === step) b.setAttribute("aria-current", "step");
      else b.removeAttribute("aria-current");
      // Replace the fill so its animation starts again with the step.
      const fill = b.querySelector(".rp-play-fill");
      fill.replaceWith(fill.cloneNode());
    }
    for (const side of play.querySelectorAll("[data-side]")) side.hidden = Number(side.dataset.side) !== step;
    q("[data-flag-preview]").hidden = step !== 1;
    q("[data-flag-live]").hidden = step !== 2;
    q("[data-afterpay-ring]").style.display = step === 0 ? "" : "none";
    q("[data-afterpay-line]").hidden = step === 0;
    q("[data-icon-pause]").hidden = !playing;
    q("[data-icon-play]").hidden = playing;
    q("[data-play-label]").textContent = playing ? "Pause" : "Play";
    toggle.setAttribute("aria-label", playing ? "Pause the walkthrough" : "Play the walkthrough");
    schedule();
  }

  const running = () => playing && inView && document.visibilityState === "visible";

  function schedule() {
    clearTimeout(timer);
    if (!running()) return;
    timer = setTimeout(() => {
      step = (step + 1) % STEPS;
      render();
    }, STEP_MS);
  }

  // Any click inside takes over from the autoplay.
  play.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (!go) return;
    playing = false;
    step = Number(go.dataset.go);
    render();
  });
  toggle.addEventListener("click", () => {
    playing = !playing;
    render();
  });
  document.addEventListener("visibilitychange", render);
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      render();
    },
    { threshold: 0.5 },
  ).observe(play);
  render();
}
