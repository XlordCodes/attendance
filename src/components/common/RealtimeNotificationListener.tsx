import React, { useEffect, useRef } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

/**
 * Shape of a single row that can appear in `public.notifications`.
 * Using a local interface instead of importing the app-wide `Notification` type
 * keeps this component independent of domain model drift.
 */
interface NotificationRow {
  id?: string;
  triggered_by?: string;
  target_role?: string;
  type?: string;
  message?: string;
  is_read?: boolean;
  created_at?: string;
}

const RealtimeNotificationListener: React.FC = () => {
  const { employee } = useAuth();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Request browser notification permission once on mount (best-effort)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Don't await — permission prompt is non-blocking
      Notification.requestPermission().catch(() => {
        /* user dismissed — silent fail */
      });
    }
  }, []);

  // Keep the Realtime channel in sync with the logged-in user
  useEffect(() => {
    // No legitimate user session → tear down any stale channel
    if (!employee?.id || !employee?.role) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`notifications-realtime-${employee.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' } as const,
        (rawPayload) => {
          // `rawPayload.new` is the newly inserted row typed as json-friendly record
          const record = (rawPayload.new ?? {}) as NotificationRow;
          const targetRole = (record.target_role ?? '').trim().toLowerCase();

          // Role-based targeting — deliver only if this user's role matches
          if (targetRole && targetRole !== employee.role.toLowerCase()) {
            return;
          }

          // Derive title and body from the payload; fall back gracefully for rows
          // that carry only a message or no notification-type column
          const title =
            record.type ??
            (typeof record.message === 'string'
              ? record.message.slice(0, 60)
              : 'Notification');

          const body = typeof record.message === 'string' ? record.message : '';

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });

            // Play a soft audio chime if the user has sound enabled
            if (employee?.sound_enabled) {
              (() => {
                try {
                  const ctx = new AudioContext();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                  gain.gain.setValueAtTime(0.3, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                  osc.connect(gain).connect(ctx.destination);
                  osc.start(ctx.currentTime);
                  osc.stop(ctx.currentTime + 0.15);
                } catch {
                  /* AudioContext unavailable — fail silently */
                }
              })();
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Clean up the listener on unmount or when the user switches
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [employee?.id, employee?.role, employee?.sound_enabled]);

  return null;
};

export default RealtimeNotificationListener;
