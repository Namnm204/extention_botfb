let isRunning = false;
let logBox = null;
let sentCount = 0;
let skippedCount = 0;
let sentCountDisplay = null;
let skippedCountDisplay = null;

document.addEventListener("DOMContentLoaded", () => {
  logBox = document.getElementById("log");
  sentCountDisplay = document.getElementById("sent-count");
  skippedCountDisplay = document.getElementById("skipped-count");

  document.getElementById("start").addEventListener("click", async () => {
    const selectedLimit = document.querySelector('input[name="limit"]:checked');
    if (!selectedLimit) {
      log("⚠️ Vui lòng chọn ngưỡng gửi.");
      return;
    }

    const limit =
      selectedLimit.value === "Infinity"
        ? Infinity
        : parseInt(selectedLimit.value);
    const delay = parseFloat(document.getElementById("delay").value) * 1000;
    const locations = document
      .getElementById("locations")
      .value.split(",")
      .map((l) => l.trim().toLowerCase())
      .filter(Boolean);

    sentCount = 0;
    skippedCount = 0;
    updateCounts();

    isRunning = true;
    log("⏳ Đang bắt đầu...");

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [limit, delay, locations],
      func: (limit, delay, locations) => {
        window.autoAddFriendRunning = true;
        let count = 0;
        const processed = new Set();

        const scrollAndHighlight = (anchor) => {
          const container = document.querySelector('[role="main"]');
          if (anchor && container) {
            anchor.scrollIntoView({ behavior: "smooth", block: "center" });
            anchor.style.outline = "3px dashed red";
            anchor.style.transition = "outline 0.3s ease-in-out";
            let blinkCount = 0;
            const blink = setInterval(() => {
              anchor.style.outline =
                blinkCount % 2 === 0 ? "3px dashed red" : "none";
              blinkCount++;
              if (blinkCount > 5) {
                clearInterval(blink);
                anchor.style.outline = "none";
              }
            }, 400);
          }
        };

        const clickNext = () => {
          if (!window.autoAddFriendRunning || count >= limit) {
            chrome.runtime.sendMessage({ done: true });
            return;
          }

          const buttons = [
            ...document.querySelectorAll('div[aria-label="Thêm bạn bè"]'),
          ].filter(
            (btn) => btn.innerText.includes("Thêm bạn bè") && btn.closest("a")
          );

          const nextButton = buttons.find((btn) => {
            const profileLink = btn.closest("a")?.href;
            return profileLink && !processed.has(profileLink);
          });

          if (!nextButton) {
            chrome.runtime.sendMessage({ done: true });
            return;
          }

          const anchor = nextButton.closest("a");
          const profileLink = anchor.href;
          const name = anchor?.innerText?.trim().split("\n")[0] || "Không rõ";
          scrollAndHighlight(anchor);
          processed.add(profileLink);
          anchor.click();

          setTimeout(() => {
            const allDivText = Array.from(document.querySelectorAll("div"))
              .map((div) => div.innerText)
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            const hasValidLocation = locations.some(
              (loc) =>
                allDivText.includes(`sống tại ${loc}`) ||
                allDivText.includes(`đến từ ${loc}`) ||
                allDivText.includes(loc)
            );

            let friendCount = 0;
            const friendText = [...document.querySelectorAll("span")]
              .map((el) => el.innerText)
              .find((text) => /\d+([.,]\d+)?[Kk]? người bạn/.test(text));

            if (friendText) {
              const match = friendText.match(/(\d+[.,]?\d*)([Kk]?)/);
              if (match) {
                let number = match[1].replace(",", ".");
                friendCount = parseFloat(number);
                if (match[2].toLowerCase() === "k") {
                  friendCount *= 1000;
                }
                friendCount = Math.round(friendCount);
              }
            }

            if (hasValidLocation && friendCount >= 500) {
              nextButton.click();
              count++;
              chrome.runtime.sendMessage({ name, url: profileLink, count });

              setTimeout(() => {
                window.history.back();
                setTimeout(clickNext, delay + 1000);
              }, 1000);
            } else {
              chrome.runtime.sendMessage({
                skipped: true,
                name,
                reason: `Bị loại: ${
                  hasValidLocation ? "" : "Không ở khu vực hợp lệ"
                } ${friendCount < 500 ? "- Dưới 500 bạn" : ""}`.trim(),
              });

              setTimeout(() => {
                window.history.back();
                setTimeout(clickNext, delay + 1000);
              }, 1000);
            }
          }, 2000);
        };

        clickNext();
      },
    });
  });

  document.getElementById("stop").addEventListener("click", async () => {
    isRunning = false;
    log("⛔ Đã yêu cầu dừng.");
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.autoAddFriendRunning = false;
      },
    });
  });
});

function log(message) {
  const now = new Date().toLocaleTimeString();
  logBox.innerHTML += `[${now}] ${message}<br />`;
  logBox.scrollTop = logBox.scrollHeight;
}

function updateCounts() {
  if (sentCountDisplay) {
    sentCountDisplay.textContent = `Tổng số lời mời đã gửi: ${sentCount}`;
  }
  if (skippedCountDisplay) {
    skippedCountDisplay.textContent = `Tổng số người bị loại: ${skippedCount}`;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.done) {
    log("✅ Đã hoàn thành gửi lời mời.");
  } else if (message.name && message.url) {
    sentCount++;
    updateCounts();
    log(
      `✅ Đã gửi lời mời kết bạn cho <a href="${message.url}" target="_blank">${message.name}</a>`
    );
  } else if (message.skipped) {
    skippedCount++;
    updateCounts();
    log(`⚠️ Bỏ qua ${message.name}: ${message.reason}`);
  }
});
