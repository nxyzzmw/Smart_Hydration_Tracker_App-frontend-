import { useEffect, useState, useCallback, useRef } from "react";
import {
  getUserProfile,
  updateUserProfile,
} from "../src/api/userApi";

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
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getUserProfile();

      if (mounted.current) {
        setProfile(data);
      }

    } catch (err) {
      console.log("Profile fetch error:", err);

      if (mounted.current) {
        setError(err);
      }

    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  // Run once on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ✅ Update profile safely
  const updateProfile = useCallback(async (data: any) => {
    try {
      setSaving(true);
      setError(null);

      const updated = await updateUserProfile(data);

      if (mounted.current) {
        setProfile(updated);
      }

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
