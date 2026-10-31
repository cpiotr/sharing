/*
 * flashcards.js – shared logic for the "Magiczne fiszki" pages.
 *
 * Usage (after the page markup, as a classic <script src="flashcards.js">):
 *
 *   const app = Flashcards.create({
 *     cards: [...],                 // any array; each page decides what a card looks like
 *     defaultMode: "EN_PL",         // optional; mode shown first
 *     modeClasses: { active: "...", inactive: "..." },  // classes for [data-mode] buttons
 *     scoreLabel: "🌟 Gwiazdki",    // text before ": <score>"
 *     renderDelay: 0,               // ms to wait before swapping card text (hides answer while flipping back)
 *     render(card, app) { return { emoji, frontLabel, frontMain, backLabel, backHtml, counter? }; },
 *
 *     // Optional hooks
 *     onNext(app)       -> true if the page handled the step itself (the library then only re-renders)
 *     onPrev(app)       -> same, for going back
 *     onModeChange(app) -> called after the mode changes
 *     onReset(app)      -> called when progress is reset
 *     actions: { "my-action": (app, element) => {} }   // extra data-action handlers
 *   });
 *
 * Expected markup: the elements with ids flashcard-container, flashcard, card-emoji,
 * front-label, front-main, back-label, back-content, card-counter, score-counter, and
 * buttons/elements carrying data-action="flip|next-known|next|prev|reset|mode"
 * (mode buttons also carry data-mode="<MODE_ID>").
 */
(function (global) {
  "use strict";

  function create(config) {
    const cards = config.cards;
    const render = config.render;
    const actions = config.actions || {};
    const modeClasses = config.modeClasses || { active: "", inactive: "" };
    const scoreLabel = config.scoreLabel || "⭐ Gwiazdki";
    const renderDelay = config.renderDelay || 0;

    const byId = id => document.getElementById(id);
    const els = {
      container: byId("flashcard-container"),
      card: byId("flashcard"),
      emoji: byId("card-emoji"),
      frontLabel: byId("front-label"),
      frontMain: byId("front-main"),
      backLabel: byId("back-label"),
      backContent: byId("back-content"),
      counter: byId("card-counter"),
      score: byId("score-counter")
    };

    const app = {
      cards,
      index: 0,
      score: 0,
      flipped: false,
      mode: config.defaultMode || null,
      els,
      update,
      flip,
      next,
      prev,
      reset,
      setMode
    };

    function setFlipped(value) {
      app.flipped = value;
      els.card.classList.toggle("rotate-y-180", value);
    }

    function updateScore() {
      els.score.textContent = `${scoreLabel}: ${app.score}`;
    }

    function updateModeButtons() {
      document.querySelectorAll("[data-mode]").forEach(button => {
        button.className = button.dataset.mode === app.mode ? modeClasses.active : modeClasses.inactive;
      });
    }

    function update() {
      setFlipped(false);
      const view = render(cards[app.index], app);
      const apply = () => {
        els.emoji.textContent = view.emoji || "📚";
        els.frontLabel.textContent = view.frontLabel;
        els.frontMain.textContent = view.frontMain;
        els.backLabel.textContent = view.backLabel;
        els.backContent.innerHTML = view.backHtml;
        els.counter.textContent = view.counter || `Karta ${app.index + 1} / ${cards.length}`;
      };
      if (renderDelay > 0) setTimeout(apply, renderDelay);
      else apply();
    }

    function flip() {
      setFlipped(!app.flipped);
    }

    function next(earnedPoint = false) {
      if (earnedPoint) {
        app.score += 1;
        updateScore();
      }
      const handled = config.onNext && config.onNext(app);
      if (!handled) app.index = (app.index + 1) % cards.length;
      update();
    }

    function prev() {
      const handled = config.onPrev && config.onPrev(app);
      if (!handled) app.index = (app.index - 1 + cards.length) % cards.length;
      update();
    }

    function reset() {
      app.index = 0;
      app.score = 0;
      if (config.onReset) config.onReset(app);
      updateScore();
      update();
    }

    function setMode(mode) {
      app.mode = mode;
      updateModeButtons();
      if (config.onModeChange) config.onModeChange(app);
      update();
    }

    // One delegated click handler. closest() picks the innermost [data-action], so a
    // button placed inside the card (e.g. "Ćwicz odmianę") does not also flip the card.
    document.addEventListener("click", event => {
      const el = event.target.closest("[data-action]");
      if (!el) return;
      const name = el.dataset.action;
      switch (name) {
        case "flip": flip(); break;
        case "next-known": next(true); break;
        case "next": next(false); break;
        case "prev": prev(); break;
        case "reset": reset(); break;
        case "mode": setMode(el.dataset.mode); break;
        default:
          if (actions[name]) actions[name](app, el);
      }
    });

    // Keyboard access: Enter / Space on the focused card flips it.
    if (!els.container.hasAttribute("tabindex")) els.container.setAttribute("tabindex", "0");
    if (!els.container.hasAttribute("role")) els.container.setAttribute("role", "button");
    els.container.addEventListener("keydown", event => {
      if (event.target !== els.container) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        flip();
      }
    });

    updateModeButtons();
    updateScore();
    update();
    return app;
  }

  global.Flashcards = { create };
})(window);
