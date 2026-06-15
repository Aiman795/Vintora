import { createContext, useContext, useEffect, useState } from "react";
import { fetchProfile, loginUser, registerUser } from "../services/api.js";
import socket from "../services/socket.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("vintora_token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchProfile();
        setUser(profile);
      } catch (error) {
        localStorage.removeItem("vintora_token");
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  useEffect(() => {
    const userId = user?._id || user?.id;

    if (!token || !userId) {
      return;
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
  }, [token, user]);

  const persistSession = (authData) => {
    localStorage.setItem("vintora_token", authData.token);
    setToken(authData.token);
    setUser(authData.user);
  };

  const login = async (payload) => {
    const data = await loginUser(payload);
    persistSession(data);
    return data;
  };

  const register = async (payload) => {
    const data = await registerUser(payload);
    persistSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("vintora_token");
    socket.disconnect();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token),
        loading,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
