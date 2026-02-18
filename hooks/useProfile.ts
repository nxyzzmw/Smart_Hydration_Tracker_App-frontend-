import { useEffect, useState, useCallback, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  getUserProfile,
  updateUserProfile,
} from "../src/api/userApi";
import {
  emitProfileChanged,
  subscribeProfileChanged,
} from "../src/events/profileEvents";

function extractProfile(payload: any) {
  if (!payload || typeof payload !== "object") return null;
  if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.profile && typeof payload.profile === "object") {
    return payload.profile;
  }
  if (payload.user && typeof payload.user === "object") {
    return payload.user;
  }
  return payload;
}

export function useProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // ✅ Fetch profile safely
  const fetchProfile = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const payload = await getUserProfile();
      const data = extractProfile(payload);

      if (mounted.current && data) {
        setProfile(data);
      }

    } catch (err) {
      console.log("Profile fetch error:", err);

      if (mounted.current) {
        setError(err);
      }

    } finally {
      if (mounted.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = subscribeProfileChanged(() => {
      fetchProfile(true);
    });
    return unsubscribe;
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile(true);
    }, [fetchProfile])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        fetchProfile(true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [fetchProfile]);

  // ✅ Update profile safely
  const updateProfile = useCallback(async (data: any) => {
    try {
      setSaving(true);
      setError(null);

      const updatePayload = await updateUserProfile(data);
      const immediate = extractProfile(updatePayload);
      if (mounted.current && immediate) {
        setProfile(immediate);
      }

      const latestPayload = await getUserProfile();
      const updated = extractProfile(latestPayload);

      if (mounted.current && updated) {
        setProfile(updated);
      }
      emitProfileChanged();

      return updated;

    } catch (err) {
      console.log("Profile update error:", err);

      if (mounted.current) {
        setError(err);
      }

      throw err;

    } finally {
      if (mounted.current) {
        setSaving(false);
      }
    }
  }, []);

  return {
    profile,
    loading,
    saving,
    error,
    refresh: fetchProfile,
    updateProfile,
  };
}
