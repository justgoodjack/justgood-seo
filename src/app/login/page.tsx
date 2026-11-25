import { LogoMark } from "@/components/Logo";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="authwrap">
      <form action="/api/login" method="post" className="card authcard formcard">
        <div style={{ marginBottom: 20 }}><LogoMark size={56} /></div>
        <h1>Back to work.</h1>
        <p className="lede" style={{ fontSize: 15 }}>Sign in to review drafts and keep your blogs on schedule.</p>
        <label>Password</label>
        <input type="password" name="password" autoFocus required />
        {error && <p className="muted" style={{ color: "var(--bad)", marginTop: 10 }}>That password didn't match. Try again.</p>}
        <p style={{ marginTop: 22 }}><button className="primary" style={{ width: "100%" }}>Continue</button></p>
      </form>
    </div>
  );
}
