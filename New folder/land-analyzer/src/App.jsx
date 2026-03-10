import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Login from "./pages/Login";
import Main from "./pages/Main";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0a0e14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#d4a843", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>กำลังโหลด...</div>
    </div>
  );

  return user ? <Main user={user} /> : <Login />;
}
