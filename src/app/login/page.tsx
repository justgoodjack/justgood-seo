export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Sign in</h1>
      <form action="/api/login" method="post">
        <label>Password</label>
        <input type="password" name="password" autoFocus required />
        {error && <p className="muted" style={{ color: "var(--warn)" }}>Wrong password.</p>}
        <p><button className="primary">Continue</button></p>
      </form>
    </div>
  );
}
