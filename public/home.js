// The home page's one moving part: the drawn Add to cart button, which
// answers a click. Ported from our earlier prototype; the page is complete
// without it.

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
    link.href = `dashboard?store=${encodeURIComponent(last)}`;
    link.textContent = "Back to your store";
  }
} catch {
  // Storage blocked: the link stays pointing at the form.
}
