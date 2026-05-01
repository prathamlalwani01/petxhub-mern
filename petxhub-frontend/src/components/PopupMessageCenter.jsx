import { useEffect, useState } from "react";

const POPUP_EVENT = "petxhub:popup";

export const showPopup = (message, options = {}) => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(POPUP_EVENT, {
      detail: {
        message: String(message || ""),
        type: options.type || "info",
        duration: options.duration || 3400,
      },
    })
  );
};

function PopupMessageCenter() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const enqueueMessage = (payload) => {
      const id = `${Date.now()}-${Math.random()}`;
      const nextMessage = {
        id,
        message: String(payload?.message || ""),
        type: payload?.type || "info",
      };
      const duration = Number(payload?.duration) > 0 ? Number(payload.duration) : 3400;

      setMessages((current) => [...current, nextMessage]);

      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
      }, duration);
    };

    const handlePopupEvent = (event) => {
      enqueueMessage(event.detail || {});
    };

    const originalAlert = window.alert;
    window.alert = (message) => {
      enqueueMessage({ message, type: "info" });
    };

    window.addEventListener(POPUP_EVENT, handlePopupEvent);

    return () => {
      window.alert = originalAlert;
      window.removeEventListener(POPUP_EVENT, handlePopupEvent);
    };
  }, []);

  const dismissMessage = (id) => {
    setMessages((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div className="petx-popup-stack" aria-live="polite" aria-atomic="false">
      {messages.map((item) => (
        <div key={item.id} className={`petx-popup petx-popup-${item.type}`}>
          <p className="mb-0">{item.message}</p>
          <button
            type="button"
            className="petx-popup-close"
            onClick={() => dismissMessage(item.id)}
            aria-label="Close message"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}

export default PopupMessageCenter;
