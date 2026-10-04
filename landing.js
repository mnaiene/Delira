// ---- Edit these values ----
const CONFIG = {
  // Your affiliate link (e.g. your HopLink). Every CTA on the page uses it.
  ctaLink: "https://abed7foog529cfqcpdu8q3060e.hop.clickbank.net",
  product: "Derila Ergo",
  // Keep these in line with the offer currently shown on the official site.
  offerShort: "on a limited-time sale",
  offerHeadline: "LIMITED TIME SALE: See Today's Discount on the Official Site",
  returnDays: 60,
  published: "October 3, 2026",
};

// Only add genuine reviews you have permission to use, e.g. from the vendor's affiliate resources.
// The reviews section stays hidden while this list is empty.
const REVIEWS = [
  // { name: "First L., Country 🇺🇸", text: "Review text..." },
];

// ---- Page wiring ----
const fill = (selector, value) =>
  document.querySelectorAll(selector).forEach((el) => (el.textContent = value));

fill("[data-product]", CONFIG.product);
fill("[data-offer-short]", CONFIG.offerShort);
fill("[data-offer-headline]", CONFIG.offerHeadline);
fill("[data-return-days]", CONFIG.returnDays);
fill("[data-published]", CONFIG.published);

document.querySelectorAll("[data-cta]").forEach((a) => {
  a.href = CONFIG.ctaLink;
  a.rel = "sponsored noopener";
  a.addEventListener("click", trackCtaClick);
});

// Report CTA clicks to the Meta Pixel as InitiateCheckout, then follow the link.
// The short delay gives the pixel request time to send before the page unloads.
function trackCtaClick(e) {
  if (typeof fbq !== "function") return;
  fbq("track", "InitiateCheckout");
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  const href = e.currentTarget.href;
  setTimeout(() => (window.location.href = href), 300);
}

if (REVIEWS.length) {
  const list = document.getElementById("reviews");
  REVIEWS.forEach(({ name, text }) => {
    const card = document.createElement("div");
    card.className = "review";
    const author = document.createElement("p");
    author.className = "review-name";
    author.textContent = name;
    const body = document.createElement("p");
    body.textContent = text;
    card.append(author, body);
    list.append(card);
  });
  document.getElementById("reviews-section").hidden = false;
}

// Keep the hero video playing (some browsers pause autoplay until the first interaction).
const heroVideo = document.querySelector(".hero-video video");
if (heroVideo) {
  const play = () => heroVideo.play().catch(() => {});
  play();
  heroVideo.addEventListener("pause", play);
  ["touchstart", "scroll", "click"].forEach((e) =>
    window.addEventListener(e, play, { once: true, passive: true })
  );
}
