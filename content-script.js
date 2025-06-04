(function createLogBox() {
  if (document.getElementById("log-popup")) return;

  const logBox = document.createElement("div");
  logBox.id = "log-popup";
  logBox.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 320px;
    display: flex;
    flex-direction: column-reverse;
    gap: 6px;
    z-index: 999999;
  `;
  document.body.appendChild(logBox);
})();

function log(message) {
  const logBox = document.getElementById("log-popup");
  if (!logBox) return;

  const now = new Date().toLocaleTimeString();
  const item = document.createElement("div");
  const match = message.match(/⚠️\s*(.+?):\s*===\s*(.+?)\s*===/);

  if (match) {
    name = match[1];
    reason = match[2];
  }

  item.innerHTML = `<strong>[${now}]</strong> <br> ${name}<br> ${reason}`;

  item.style.cssText = `
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 16px;
    font-family: monospace;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    opacity: 0;
    transform: translateX(20px);
    animation: fadeIn 0.3s ease-out forwards;
  `;

  // 👉 Giới hạn số log hiển thị
  if (logBox.children.length >= 7) {
    const oldest = logBox.lastElementChild;
    if (oldest) {
      oldest.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      oldest.style.opacity = "0";
      oldest.style.transform = "translateX(20px)";
      setTimeout(() => oldest.remove(), 500);
    }
  }

  // 🕒 Tự biến mất sau 15s
  setTimeout(() => {
    item.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    item.style.opacity = "0";
    item.style.transform = "translateX(20px)";
    setTimeout(() => {
      item.remove();
    }, 500);
  }, 15000);

  logBox.appendChild(item);
}

// Từ extension gửi log như bình thường
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "log") {
    log(request.message);
  }
});

// Thêm animation bằng cách chèn CSS
const style = document.createElement("style");
style.innerHTML = ` 
@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`;
document.head.appendChild(style);
