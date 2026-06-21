import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Profile {
  fullName: string;
  email: string;
  hourlyRate: number;
}

interface Paginated<T> {
  items: T[];
}

interface ShiftAssignment {
  id: string;
  shift: { title: string | null; startTime: string; endTime: string };
}

interface Payroll {
  id: string;
  salary: number;
  totalHours: number;
  isPaid: boolean;
  fromDate: string;
  toDate: string;
}

export function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<Profile>("/me"),
      api<Paginated<ShiftAssignment>>("/me/shifts"),
      api<Paginated<Payroll>>("/me/payroll"),
    ])
      .then(([p, s, pay]) => {
        setProfile(p);
        setShifts(s.items);
        setPayrolls(pay.items);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"));
  }, []);

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!profile) return <p>Loading…</p>;

  return (
    <div>
      <h2>Hello, {profile.fullName}</h2>
      <p>Hourly rate: €{profile.hourlyRate.toFixed(2)}</p>

      <section style={{ marginTop: 24 }}>
        <h3>My Shifts</h3>
        {shifts.length === 0 ? (
          <p>No shifts assigned.</p>
        ) : (
          <ul>
            {shifts.map((s) => (
              <li key={s.id}>
                {s.shift.title ?? "Shift"} — {new Date(s.shift.startTime).toLocaleString()} –{" "}
                {new Date(s.shift.endTime).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>My Payroll</h3>
        {payrolls.length === 0 ? (
          <p>No payroll records yet.</p>
        ) : (
          <ul>
            {payrolls.map((p) => (
              <li key={p.id}>
                €{p.salary.toFixed(2)} ({p.totalHours}h) — {p.isPaid ? "Paid" : "Pending"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p style={{ marginTop: 24, color: "#666" }}>
        MVP placeholder — add check-in/out buttons and notification inbox in next phase.
      </p>
    </div>
  );
}
