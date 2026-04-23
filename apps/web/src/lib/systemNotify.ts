/** Системное уведомление браузера (если разрешено). */
export function trySystemNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: "neberi-reputation" });
    } catch {
      /* ignore */
    }
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((p) => {
      if (p === "granted") {
        try {
          new Notification(title, { body, tag: "neberi-reputation" });
        } catch {
          /* ignore */
        }
      }
    });
  }
}
