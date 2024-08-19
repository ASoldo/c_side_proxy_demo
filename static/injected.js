console.log("Injected script loaded");

const BLOCK_MALICIOUS_SCRIPT = true; // Toggle this to true or false to block/not block the specific malicious script
const BLOCK_ALL_SCRIPTS = true; // Toggle this to true or false to block/not block all scripts after initial load

// Function to log and block scripts
function logAndBlockScripts(scripts) {
  scripts.forEach((script) => {
    console.log("External Script Detected:", script.src || "<inline script>");

    fetch("http://127.0.0.1:8080/log-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ src: script.src || "<inline script>" }),
    });

    // Conditionally block the malicious script
    if (BLOCK_MALICIOUS_SCRIPT && script.src.includes("/static/malicious.js")) {
      console.log("Blocking malicious script:", script.src);
      script.remove(); // Remove the script element immediately
    }

    // Conditionally block all new scripts
    if (BLOCK_ALL_SCRIPTS) {
      console.log("Blocking script:", script.src || "<inline script>");
      script.remove(); // Remove the script element immediately
    }
  });
}

// Override document methods to block scripts before they are added
(function () {
  const originalAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function (element) {
    if (
      (BLOCK_MALICIOUS_SCRIPT &&
        element.tagName === "SCRIPT" &&
        element.src &&
        element.src.includes("/static/malicious.js")) ||
      (BLOCK_ALL_SCRIPTS && element.tagName === "SCRIPT")
    ) {
      console.log(
        "Blocking script before append:",
        element.src || "<inline script>",
      );
      return element; // Block the script by not appending it
    }
    return originalAppendChild.call(this, element);
  };

  const originalInsertBefore = Element.prototype.insertBefore;
  Element.prototype.insertBefore = function (newElement, referenceElement) {
    if (
      (BLOCK_MALICIOUS_SCRIPT &&
        newElement.tagName === "SCRIPT" &&
        newElement.src &&
        newElement.src.includes("/static/malicious.js")) ||
      (BLOCK_ALL_SCRIPTS && newElement.tagName === "SCRIPT")
    ) {
      console.log(
        "Blocking script before insert:",
        newElement.src || "<inline script>",
      );
      return newElement; // Block the script by not inserting it
    }
    return originalInsertBefore.call(this, newElement, referenceElement);
  };
})();

// Initial script check upon DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
  const scripts = document.querySelectorAll("script[src]");
  logAndBlockScripts(scripts);

  // Inject the malicious script explicitly for testing purposes
  const maliciousScript = document.createElement("script");
  maliciousScript.src = "/static/malicious.js";
  document.head.appendChild(maliciousScript);
  console.log("Malicious script injected for testing");
});

// Observe the DOM for newly added scripts
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === "SCRIPT" && node.src) {
          logAndBlockScripts([node]);
        }
      });
    }
  });
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});
