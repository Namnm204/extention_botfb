if (!document.getElementById("friend-helper-frame")) {
  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("popup.html");
  iframe.id = "friend-helper-frame";
  iframe.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    width: 400px;
    height: 450px;
    z-index: 99999999;
    border: none;
    background-color: white;
    overflow: hidden;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);

  `;
  document.body.appendChild(iframe);
} else {
  // Nếu đã tồn tại thì ẩn/hiện
  const iframe = document.getElementById("friend-helper-frame");
  iframe.style.display = iframe.style.display === "none" ? "block" : "none";
}
