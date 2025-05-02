let isRunning = false;
let logBox = null;

document.addEventListener("DOMContentLoaded", () => {
  logBox = document.getElementById("log");

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
    isRunning = true;
    log("⏳ Đang bắt đầu...");

    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [limit, delay],
      func: (limit, delay) => {
        window.autoAddFriendRunning = true;
        let count = 0;
        const processed = new Set();

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
          processed.add(profileLink);

          anchor.click();

          setTimeout(() => {
            const infoSection = Array.from(document.querySelectorAll("div"))
              .map((div) => div.innerText)
              .find((text) => text && text.includes("Sống tại"));

            if (infoSection && infoSection.includes("Hà Nội")) {
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
                reason: "Không sống tại Hà Nội hoặc không có thông tin vị trí",
              });

              setTimeout(() => {
                window.history.back();
                setTimeout(clickNext, delay + 1000);
              }, 1000);
            }
          }, 3000); // đợi trang cá nhân load
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.done) {
    log("✅ Đã hoàn thành gửi lời mời.");
  } else if (message.name && message.url) {
    log(
      `✅ Đã gửi lời mời kết bạn cho <a href="${message.url}" target="_blank">${message.name}</a>`
    );
  } else if (message.skipped) {
    log(`⚠️ Bỏ qua ${message.name}: ${message.reason}`);
  }
});
