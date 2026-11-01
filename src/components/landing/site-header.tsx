import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="top">
      <div className="topline" aria-hidden="true" />
      <div className="wrap">
        <a className="mark" href="#top" aria-label="Memoba home"><i /><i /><b>Memoba</b></a>
        <nav aria-label="Page"><a href="#memories">Two memories</a><a href="#engine">How it answers</a><a href="#honest">What it won&apos;t say</a></nav>
        <Link className="btn" href="/login">Open the demo</Link>
      </div>
    </header>
  );
}
