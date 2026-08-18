document.getElementById("agreeBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SET_CONSENT" }, (response) => {
    const result = document.getElementById("result");
    if (response && response.success) {
      result.textContent = "Consent saved successfully.";
    } else {
      result.textContent = "Failed to save consent.";
    }
  });
});