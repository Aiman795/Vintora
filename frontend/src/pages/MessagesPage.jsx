import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { createConversation, fetchConversations, fetchMessages, markAllNotificationsRead, sendMessage } from "../services/api.js";
import socket from "../services/socket.js";

export default function MessagesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [callState, setCallState] = useState("idle");
  const [incomingCall, setIncomingCall] = useState(null);
  const conversationParam = searchParams.get("conversation");
  const participantId = searchParams.get("participant");
  const listingId = searchParams.get("listing");
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const currentUserId = user?._id || user?.id;

  const getOtherParticipant = (conversation = selectedConversation) => {
    return conversation?.participants?.find((participant) => participant._id !== currentUserId);
  };

  const stopCall = (notifyPeer = true) => {
    const otherParticipant = getOtherParticipant();
    if (notifyPeer && otherParticipant?._id) {
      socket.emit("end_call", { to: otherParticipant._id, from: currentUserId });
    }

    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setCallState("idle");
    setIncomingCall(null);
  };

  const createPeer = async (remoteUserId) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice_candidate", { to: remoteUserId, from: currentUserId, candidate: event.candidate });
      }
    };

    peer.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peerRef.current = peer;
    return peer;
  };

  useEffect(() => {
    async function refreshConversations() {
      try {
        const data = await fetchConversations();
        setConversations(data);

        if (conversationParam) {
          const matchedConversation = data.find((conversation) => conversation._id === conversationParam);
          if (matchedConversation) {
            setSelectedConversation(matchedConversation);
            return;
          }
        }

        if (!selectedConversation && data.length > 0) {
          setSelectedConversation(data[0]);
        }
      } catch (_error) {
        // Keep the current screen responsive even if the sidebar refresh fails.
      }
    }

    const handleReceiveMessage = (message) => {
      setConversations((current) => {
        const exists = current.some((conversation) => conversation._id === message.conversation);
        if (exists) {
          const updated = current.map((conversation) =>
            conversation._id === message.conversation ? { ...conversation, updatedAt: message.createdAt } : conversation
          );
          updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          return updated;
        }

        refreshConversations();
        return current;
      });

      setMessages((current) => {
        if (selectedConversation?._id !== message.conversation) {
          return current;
        }

        const alreadyExists = current.some((item) => item._id === message._id);
        return alreadyExists ? current : [...current, message];
      });
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => socket.off("receive_message", handleReceiveMessage);
  }, [conversationParam, selectedConversation]);

  useEffect(() => {
    const handleIncomingCall = async ({ from, fromName, signal }) => {
      setIncomingCall({ from, fromName, signal });
      setCallState("ringing");
    };

    const handleCallAnswered = async ({ signal }) => {
      if (!peerRef.current) return;
      await peerRef.current.setRemoteDescription(new RTCSessionDescription(signal));
      setCallState("connected");
    };

    const handleIceCandidate = async ({ candidate }) => {
      if (!peerRef.current) return;
      try {
        await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (_error) {
        setStatus("Unable to add call network candidate.");
      }
    };

    const handleCallEnded = () => {
      stopCall(false);
      setStatus("Voice call ended.");
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_answered", handleCallAnswered);
    socket.on("ice_candidate", handleIceCandidate);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_answered", handleCallAnswered);
      socket.off("ice_candidate", handleIceCandidate);
      socket.off("call_ended", handleCallEnded);
    };
  }, [currentUserId, selectedConversation]);

  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await fetchConversations();
        setConversations(data);

        if (conversationParam) {
          const matchedConversation = data.find((conversation) => conversation._id === conversationParam);
          if (matchedConversation) {
            setSelectedConversation(matchedConversation);
            return;
          }
        }

        if (data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0]);
        }
      } catch (error) {
        setStatus(error.response?.data?.message || "Unable to load conversations.");
      }
    }

    loadConversations();
  }, [conversationParam]);

  useEffect(() => {
    async function ensureConversation() {
      if (!participantId || !user) {
        return;
      }

      try {
        const conversation = await createConversation({
          participantId,
          listingId
        });

        setConversations((current) => {
          const withoutDuplicate = current.filter((item) => item._id !== conversation._id);
          return [conversation, ...withoutDuplicate];
        });
        setSelectedConversation(conversation);
      } catch (error) {
        setStatus(error.response?.data?.message || "Unable to open conversation.");
      }
    }

    ensureConversation();
  }, [listingId, participantId, user]);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedConversation?._id) {
        setMessages([]);
        return;
      }

      try {
        const data = await fetchMessages(selectedConversation._id);
        setMessages(data);
      } catch (error) {
        setStatus(error.response?.data?.message || "Unable to load messages.");
      }
    }

    loadMessages();
  }, [selectedConversation?._id]);

  useEffect(() => {
    async function markConversationNotifications() {
      if (!selectedConversation?._id) {
        return;
      }

      try {
        await markAllNotificationsRead({ conversationId: selectedConversation._id });
        window.dispatchEvent(
          new CustomEvent("vintora:notifications-read", {
            detail: { conversationId: selectedConversation._id }
          })
        );
      } catch (_error) {
        // Keep the page usable even if read-state syncing fails.
      }
    }

    markConversationNotifications();
  }, [selectedConversation?._id]);

  const conversationItems = useMemo(() => {
    return conversations.map((conversation) => {
      const otherParticipant = conversation.participants.find((participant) => participant._id !== (user?._id || user?.id));
      return {
        ...conversation,
        otherParticipant
      };
    });
  }, [conversations, user]);

  const startVoiceCall = async () => {
    const otherParticipant = getOtherParticipant();
    if (!otherParticipant?._id) {
      setStatus("Choose a conversation before starting a call.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Voice calls need microphone permission in a supported browser.");
      return;
    }

    try {
      setCallState("calling");
      const peer = await createPeer(otherParticipant._id);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call_user", {
        to: otherParticipant._id,
        from: currentUserId,
        fromName: user?.name || "Vintora user",
        signal: offer
      });
    } catch (error) {
      stopCall(false);
      setStatus(error.message || "Unable to start voice call.");
    }
  };

  const answerVoiceCall = async () => {
    if (!incomingCall) return;

    try {
      const peer = await createPeer(incomingCall.from);
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("answer_call", { to: incomingCall.from, from: currentUserId, signal: answer });
      setCallState("connected");
      setIncomingCall(null);
    } catch (error) {
      stopCall(false);
      setStatus(error.message || "Unable to answer voice call.");
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !selectedConversation) {
      return;
    }

    const otherParticipant = selectedConversation.participants.find((participant) => participant._id !== (user?._id || user?.id));
    if (!otherParticipant?._id) {
      setStatus("Receiver not found for this conversation.");
      return;
    }

    try {
      const savedMessage = await sendMessage({
        conversationId: selectedConversation._id,
        receiverId: otherParticipant._id,
        text: draft
      });

      setMessages((current) => [...current, savedMessage]);
      setDraft("");
      setStatus("");
      setConversations((current) => {
        const updated = current.map((conversation) =>
          conversation._id === selectedConversation._id ? { ...conversation, updatedAt: savedMessage.createdAt } : conversation
        );
        updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return updated;
      });
    } catch (error) {
      setStatus(error.response?.data?.message || "Unable to send message.");
    }
  };

  return (
    <main className="page">
      <div className="page-header-bar">
        <div>
          <h2>Messages</h2>
          <p>Chat with lenders and renters in one place using your Vintora account.</p>
        </div>
      </div>

      <section className="closet-body" style={{ paddingTop: 0 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "320px 1fr",
            gap: "24px",
            alignItems: "start"
          }}
        >
          <div className="data-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="data-card-head" style={{ padding: "24px 24px 12px" }}>
              <h3>Conversations</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {conversationItems.length === 0 ? (
                <p className="muted-note" style={{ padding: "0 24px 24px" }}>
                  No conversations yet. Open any listing and click Chat to start.
                </p>
              ) : (
                conversationItems.map((conversation) => (
                  <button
                    key={conversation._id}
                    onClick={() => setSelectedConversation(conversation)}
                    style={{
                      border: "none",
                      borderTop: "1px solid var(--border-light)",
                      background: selectedConversation?._id === conversation._id ? "var(--linen)" : "transparent",
                      padding: "18px 24px",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                    type="button"
                  >
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", color: "var(--ink)" }}>
                      {conversation.otherParticipant?.name || "User"}
                    </div>
                    <p className="muted-note" style={{ margin: "4px 0 0" }}>
                      {conversation.listing?.title || "Direct conversation"}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="data-card">
            {selectedConversation ? (
              <>
                <div className="data-card-head">
                  <h3>
                    {selectedConversation.participants.find((participant) => participant._id !== (user?._id || user?.id))?.name || "Chat"}
                  </h3>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button className="btn btn-outline" disabled={callState !== "idle"} onClick={startVoiceCall} type="button">
                      Voice Call
                    </button>
                    {callState !== "idle" ? (
                      <button className="btn btn-gold" onClick={() => stopCall(true)} type="button">
                        End Call
                      </button>
                    ) : null}
                    {selectedConversation.listing?._id ? (
                      <Link className="btn btn-outline" to={`/product/${selectedConversation.listing._id}`}>
                        View Listing
                      </Link>
                    ) : null}
                  </div>
                </div>

                {incomingCall ? (
                  <div className="data-card" style={{ marginBottom: "16px", padding: "16px" }}>
                    <p className="muted-note" style={{ marginTop: 0 }}>
                      Incoming voice call from <strong>{incomingCall.fromName || "Vintora user"}</strong>
                    </p>
                    <button className="btn btn-primary" onClick={answerVoiceCall} type="button">Answer</button>
                    <button className="btn btn-outline" onClick={() => stopCall(true)} style={{ marginLeft: "8px" }} type="button">Decline</button>
                  </div>
                ) : null}
                <audio autoPlay ref={remoteAudioRef} />
                {callState !== "idle" ? <p className="muted-note">Call status: {callState}</p> : null}

                <div
                  style={{
                    minHeight: "340px",
                    maxHeight: "460px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    padding: "8px 0 24px"
                  }}
                >
                  {messages.length === 0 ? (
                    <p className="muted-note">No messages yet. Start the conversation below.</p>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.sender?._id === (user?._id || user?.id);
                      return (
                        <div
                          key={message._id}
                          style={{
                            alignSelf: isOwn ? "flex-end" : "flex-start",
                            background: isOwn ? "var(--sepia)" : "var(--linen)",
                            color: isOwn ? "var(--ivory)" : "var(--ink)",
                            padding: "14px 18px",
                            borderRadius: "8px",
                            maxWidth: "70%"
                          }}
                        >
                          <div style={{ fontSize: "14px", lineHeight: 1.6 }}>{message.text}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="filter-group" style={{ marginBottom: "12px" }}>
                  <div className="filter-group-title">Message</div>
                  <textarea
                    className="price-input"
                    name="message"
                    onChange={(event) => setDraft(event.target.value)}
                    rows="4"
                    style={{ width: "100%", resize: "vertical" }}
                    value={draft}
                  />
                </div>
                {status ? <p className="muted-note">{status}</p> : null}
                <button className="btn btn-primary" onClick={handleSend} type="button">
                  Send Message
                </button>
              </>
            ) : (
              <>
                <div className="data-card-head">
                  <h3>Open a Conversation</h3>
                </div>
                <p className="muted-note">Choose a conversation from the left side or start one from any listing page.</p>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
