import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import socket from "../services/socket.js";

const notificationGroups = [
  { key: "message", label: "Messages", types: ["message"] },
  { key: "booking", label: "Bookings", types: ["booking", "approval"] },
  { key: "dispute", label: "Disputes", types: ["dispute", "system"] },
  { key: "review", label: "Reviews", types: ["review"] }
];

export default function NotificationBell() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [panelNotifications, setPanelNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const autoCloseTimer = useRef(null);
  const userId = user?._id || user?.id;

  useEffect(() => {
    if (!token || !userId) {
      setNotifications([]);
      return undefined;
    }

    let cancelled = false;

    async function loadNotifications() {
      try {
        const data = await fetchNotifications();
        if (!cancelled) {
          setNotifications(data.filter((notification) => !notification.isRead));
        }
      } catch (_error) {
        if (!cancelled) {
          setNotifications([]);
        }
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [token, userId]);

  useEffect(() => {
    if (!token || !userId) {
      return undefined;
    }

    const joinUserRoom = () => {
      socket.emit("join", userId);
    };

    if (!socket.connected) {
      socket.connect();
      socket.once("connect", joinUserRoom);
    } else {
      joinUserRoom();
    }

    return () => {
      socket.off("connect", joinUserRoom);
    };
  }, [token, userId]);

  useEffect(() => {
    return () => {
      if (autoCloseTimer.current) {
        window.clearTimeout(autoCloseTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleReceiveNotification = (notification) => {
      setNotifications((current) => [notification, ...current.filter((item) => item._id !== notification._id)].slice(0, 20));
      setPanelNotifications((current) => (open ? [notification, ...current.filter((item) => item._id !== notification._id)].slice(0, 20) : current));
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title || "Vintora alert", { body: notification.message || "You have a new update." });
      }
    };

    socket.on("receive_notification", handleReceiveNotification);
    return () => socket.off("receive_notification", handleReceiveNotification);
  }, [open]);

  useEffect(() => {
    const handleNotificationsRead = (event) => {
      const conversationId = event.detail?.conversationId;

      setNotifications((current) =>
        conversationId
          ? current.filter((notification) => notification.conversation?._id !== conversationId)
          : []
      );
      setPanelNotifications((current) =>
        conversationId
          ? current.filter((notification) => notification.conversation?._id !== conversationId)
          : []
      );
    };

    window.addEventListener("vintora:notifications-read", handleNotificationsRead);
    return () => window.removeEventListener("vintora:notifications-read", handleNotificationsRead);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.isRead).length, [notifications]);
  const groupedNotifications = useMemo(() => {
    return notificationGroups.map((group) => ({
      ...group,
      items: panelNotifications.filter((notification) => group.types.includes(notification.type))
    }));
  }, [panelNotifications]);

  const handleOpen = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (autoCloseTimer.current) {
      window.clearTimeout(autoCloseTimer.current);
    }

    if (nextOpen) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
      setPanelNotifications(notifications);

      if (unreadCount > 0) {
        await markAllNotificationsRead();
        setNotifications([]);
      }

      autoCloseTimer.current = window.setTimeout(() => {
        setOpen(false);
        setPanelNotifications([]);
      }, 5000);
    } else {
      setPanelNotifications([]);
    }
  };

  const handleClickNotification = async (notification) => {
    if (autoCloseTimer.current) {
      window.clearTimeout(autoCloseTimer.current);
    }

    await markNotificationRead(notification._id);
    setNotifications((current) => current.filter((item) => item._id !== notification._id));
    setPanelNotifications((current) => current.filter((item) => item._id !== notification._id));
    setOpen(false);

    if (notification.conversation?._id) {
      navigate(`/messages?conversation=${notification.conversation._id}`);
    } else if (notification.type === "booking" || notification.booking?._id) {
      navigate("/dashboard?section=bookings");
    } else if (notification.type === "system") {
      navigate("/admin");
    } else {
      navigate("/messages");
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-outline" onClick={handleOpen} type="button">
        Alerts {unreadCount > 0 ? `(${unreadCount})` : ""}
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 10px)",
            width: "320px",
            background: "var(--ivory)",
            border: "1px solid var(--border)",
            boxShadow: "0 12px 30px var(--shadow)",
            zIndex: 400
          }}
        >
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border-light)" }}>
            <strong>Notifications</strong>
          </div>

          {panelNotifications.length === 0 ? (
            <p className="muted-note" style={{ padding: "16px 18px" }}>
              No new notifications.
            </p>
          ) : (
            groupedNotifications.map((group) => (
              <div key={group.key}>
                <div className="notification-group-title">{group.label}</div>
                {group.items.length ? group.items.map((notification) => (
                  <button
                    key={notification._id}
                    onClick={() => handleClickNotification(notification)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid var(--border-light)",
                      background: "var(--linen)",
                      padding: "14px 18px",
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "4px" }}>{notification.title}</div>
                    <div className="muted-note">{notification.message}</div>
                  </button>
                )) : <p className="muted-note notification-empty">No {group.label.toLowerCase()} alerts.</p>}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
