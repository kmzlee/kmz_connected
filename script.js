/* ===========================================================
   KMZ — CONNECT PORTAL
   Full-page navigation with "Construct" grid-door transition
   =========================================================== */

(function () {
  "use strict";

  var BUILD_ID = "2026-09-04-v4-singlefile";

  var pagesEl = document.getElementById("pages");
  var pages = Array.prototype.slice.call(pagesEl.querySelectorAll(".page"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('a[href^="#"]'));

  var gridLeft = document.querySelector(".grid-left");
  var gridRight = document.querySelector(".grid-right");
  var bloom = document.querySelector(".construct-bloom");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var currentIndex = 0;
  var isAnimating = false;
  var DURATION = 1150; // ms
  var SWAP_AT = 0.55;  // fraction of progress where the panel swap happens (screen is fully white here)

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
  function mapRange(t, a, b) { return clamp01((t - a) / (b - a)); }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function setOverlay(t) {
    var gs = mapRange(t, 0, 0.30);          // grid doors grow from center seam
    var dp = mapRange(t, 0.20, 0.65);       // doors slide apart to the sides
    var bloomIn = mapRange(t, 0.15, 0.50);  // white bloom grows + fades in
    var bloomOut = mapRange(t, 0.58, 0.96); // bloom fades back out after swap

    var bloomOpacity = t < 0.55 ? bloomIn : (1 - bloomOut);
    var bloomScale = 0.05 + Math.min(1, bloomIn + (t >= 0.55 ? 1 : 0)) * 2.3;

    gridLeft.style.transform = "scaleX(" + gs + ") translateX(" + (-dp * 100) + "%)";
    gridRight.style.transform = "scaleX(" + gs + ") translateX(" + (dp * 100) + "%)";
    bloom.style.opacity = bloomOpacity;
    bloom.style.transform = "scale(" + bloomScale + ")";
  }

  function resetOverlay() {
    gridLeft.style.transform = "scaleX(0) translateX(0)";
    gridRight.style.transform = "scaleX(0) translateX(0)";
    bloom.style.opacity = 0;
    bloom.style.transform = "scale(0.05)";
  }

  function updateNav() {
    var currentId = pages[currentIndex].id;
    navLinks.forEach(function (a) {
      var isCurrent = a.getAttribute("href") === "#" + currentId;
      a.classList.toggle("is-current", isCurrent);
    });
    // Some browsers (notably Safari) throw a SecurityError for history.replaceState
    // on file:// pages. That must never be allowed to break the transition loop.
    try {
      history.replaceState(null, "", "#" + currentId);
    } catch (err) { /* ignore — cosmetic only */ }
  }

  function activate(idx) {
    pages[currentIndex].classList.remove("is-active");
    pages[currentIndex].scrollTop = 0;
    currentIndex = idx;
    pages[currentIndex].classList.add("is-active");
    pages[currentIndex].scrollTop = 0;
    updateNav();
  }

  function goTo(targetIndex) {
    if (isAnimating) return;
    if (targetIndex < 0 || targetIndex >= pages.length) return;
    if (targetIndex === currentIndex) return;

    if (reduceMotion) {
      activate(targetIndex);
      return;
    }

    isAnimating = true;
    var swapped = false;
    var start = null;

    // Safety net: whatever happens (a thrown error, a stalled rAF, a browser
    // quirk), never let the site get permanently stuck mid-transition.
    var watchdog = setTimeout(function () {
      resetOverlay();
      if (!swapped) activate(targetIndex);
      isAnimating = false;
    }, DURATION + 500);

    function finish() {
      clearTimeout(watchdog);
      resetOverlay();
      isAnimating = false;
    }

    function frame(ts) {
      try {
        if (start === null) start = ts;
        var raw = clamp01((ts - start) / DURATION);

        setOverlay(raw); // drive the visual timing off raw progress for a snappier feel

        if (!swapped && raw >= SWAP_AT) {
          activate(targetIndex);
          swapped = true;
        }

        if (raw < 1) {
          requestAnimationFrame(frame);
        } else {
          finish();
        }
      } catch (err) {
        // Never leave the transition half-finished.
        if (!swapped) activate(targetIndex);
        finish();
      }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- wheel ---------- */
  var wheelLock = false;
  window.addEventListener("wheel", function (e) {
    e.preventDefault();
    if (isAnimating || wheelLock) return;

    if (e.deltaY > 0 && currentIndex < pages.length - 1) {
      wheelLock = true;
      goTo(currentIndex + 1);
      setTimeout(function () { wheelLock = false; }, DURATION + 80);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      wheelLock = true;
      goTo(currentIndex - 1);
      setTimeout(function () { wheelLock = false; }, DURATION + 80);
    }
  }, { passive: false });

  /* ---------- touch ---------- */
  var touchStartY = null;

  window.addEventListener("touchstart", function (e) {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener("touchmove", function (e) {
    if (touchStartY === null || isAnimating) return;

    var deltaY = touchStartY - e.touches[0].clientY; // positive = swiping up (want next)

    if (deltaY > 0 && currentIndex < pages.length - 1) {
      e.preventDefault();
    } else if (deltaY < 0 && currentIndex > 0) {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("touchend", function (e) {
    if (touchStartY === null || isAnimating) { touchStartY = null; return; }

    var endY = e.changedTouches[0].clientY;
    var deltaY = touchStartY - endY;
    var THRESHOLD = 60;

    if (deltaY > THRESHOLD && currentIndex < pages.length - 1) {
      goTo(currentIndex + 1);
    } else if (deltaY < -THRESHOLD && currentIndex > 0) {
      goTo(currentIndex - 1);
    }
    touchStartY = null;
  }, { passive: true });

  /* ---------- keyboard ---------- */
  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "PageDown") {
      e.preventDefault();
      goTo(currentIndex + 1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      goTo(currentIndex - 1);
    }
  });

  /* ---------- nav / anchor clicks ---------- */
  navLinks.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var id = a.getAttribute("href").slice(1);
      var idx = pages.findIndex(function (p) { return p.id === id; });
      if (idx > -1) goTo(idx);
    });
  });

  /* ---------- initial state (deep link support) ---------- */
  (function init() {
    var hashId = window.location.hash.replace("#", "");
    var idx = pages.findIndex(function (p) { return p.id === hashId; });
    if (idx > 0) {
      pages[0].classList.remove("is-active");
      currentIndex = idx;
      pages[idx].classList.add("is-active");
    }
    updateNav();
    // Verify in DevTools console that you're on the latest build if the
    // transition ever looks wrong — a stale cached copy won't print this.
    console.log("KMZ Connect Portal — build " + BUILD_ID);
  })();
})();
