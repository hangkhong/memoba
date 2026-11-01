import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { Engine } from "./engine";

const wideSize = { width: 2880, height: 1800 };
const phoneSize = { width: 1170, height: 2340 };
const src = (name: string) => `/landing/${name}.png`;

/** Section index and name, as listed in the landing spec. */
function SectionTag({ n, name }: { n: number; name: string }) {
  return <p className="tag"><span>{String(n).padStart(2, "0")} / 07</span><span>{name}</span></p>;
}

function Shot({ name, alt, sizes, className = "" }: { name: string; alt: string; sizes: string; className?: string }) {
  return <Image className={`shot ${className}`.trim()} src={src(name)} alt={alt} sizes={sizes} {...wideSize} />;
}

/** Desktop capture with a phone-specific source. next/image has no <picture>, so the sources come from getImageProps. */
function ResponsiveShot({ name, phone, alt, hero = false }: { name: string; phone: string; alt: string; hero?: boolean }) {
  const sizes = "(max-width: 900px) 100vw, 1200px";
  const loading = hero ? ({ loading: "eager", fetchPriority: "high" } as const) : {};
  const { props: desktop } = getImageProps({ src: src(name), alt, sizes, ...wideSize, ...loading });
  const { props: mobile } = getImageProps({ src: src(phone), alt, sizes, ...phoneSize, ...loading });
  return (
    <picture>
      <source media="(max-width: 900px)" srcSet={mobile.srcSet} sizes={sizes} />
      <img {...desktop} className="shot main" alt={alt} />
    </picture>
  );
}

export function Hero() {
  return (
    <section className="hero"><div className="wrap">
      <div className="head">
        <SectionTag n={1} name="Overview" />
        <h1>Your team already solved this. Nobody remembers where.</h1>
        <div className="side">
          <p className="lede">Memoba answers questions from your team&apos;s recorded cases and process documents, and cites the sources it read.</p>
          <Link className="btn" href="/login">Open the demo</Link>
        </div>
      </div>
      <figure className="stage hero-stage">
        <span className="steps" aria-hidden="true" />
        <ResponsiveShot hero name="chat-answer" phone="chat-answer-phone" alt="A Memoba conversation: a release question answered from the production release procedure, with numbered citations." />
        <Image className="shot float" src={src("evidence-panel")} width={760} height={1040} sizes="340px" alt="The source evidence panel showing the approach section of the staged rollout case." />
      </figure>
      <p className="cap">A saved answer from the demo workspace. Open any citation to read the section behind it.</p>
    </div></section>
  );
}

const lostItems = [
  ["The conditions", "No feature flag, no rollback rehearsal, no weekend on-call owner, and a Friday afternoon release."],
  ["The road not taken", "A 5% start was discussed and rejected, because the feature had to be visible during a keynote."],
  ["What really happened", "About 900 duplicate invoices for roughly 70 customers, found through a customer email on Saturday evening."],
  ["What to do next time", "A fixed date is a reason to cut scope, not to skip a staged rollout."],
] as const;

export function Problem() {
  return (
    <section className="lost"><div className="wrap">
      <div className="head"><SectionTag n={2} name="The problem" /><h2>The ticket survives. The reasoning doesn&apos;t.</h2></div>
      <figure className="stage lost-stage">
        <ResponsiveShot name="recurring-case" phone="recurring-case-phone" alt="The Memoba case page for the all-at-once launch of recurring invoices, showing outcome Not achieved, the observed outcome, and lessons." />
        <div className="tick" role="img" aria-label="An illustrative ticket reading Recurring invoices, status Done"><i /><div><b>Recurring invoices</b><span>Done</span></div></div>
      </figure>
      <p className="cap">The small ticket is an illustration of what usually remains. Behind it is the case as recorded in the demo workspace.</p>
      <ul className="lostl">{lostItems.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul>
    </div></section>
  );
}

export function TwoMemories() {
  const sizes = "(max-width: 900px) 100vw, 650px";
  return (
    <section className="two" id="memories"><div className="wrap">
      <div className="head"><SectionTag n={3} name="Two memories" /></div>
      <div className="memgrid">
      <div className="mem">
        <div className="memt"><i className="sh c" /><h2>Cases say what happened.</h2><p>A case records the problem, conditions, approach, and the outcome someone actually observed.</p></div>
        <div className="stage crop"><Shot name="case-page" sizes={sizes} alt="The case page for the staged rollout of the invoice approval workflow." /></div>
      </div>
      <div className="mem">
        <div className="memt"><i className="sh k" /><h2>Documents say what is required.</h2><p>A document is the versioned rule in force today, with its owner and effective date.</p></div>
        <div className="stage crop"><Shot name="document-page" sizes={sizes} alt="The document page for the production release procedure, version 3." /></div>
      </div>
      </div>
    </div></section>
  );
}

export function EngineSection() {
  return (
    <Engine
      intro={<div className="intro"><div><SectionTag n={4} name="How it answers" /><h2>A chatbot answers from what it&apos;s given. Memoba goes and reads.</h2></div><p>The model chooses what to search and read. The application holds the limits and checks every citation.</p></div>}
    />
  );
}

export function Workspace() {
  const sizes = "(max-width: 900px) 100vw, 650px";
  return (
    <section className="work"><div className="wrap">
      <div className="head"><SectionTag n={5} name="Workspace" /><h2>See what the team knows, and where it&apos;s thin.</h2></div>
      <div className="pair">
        <div><div className="stage crop"><Shot name="knowledge-hub" sizes={sizes} alt="Knowledge Hub listing recorded cases with their template, outcome, and status." /></div><div className="pt"><h3>Knowledge Hub</h3><p>Every case and process document in one place, with its outcome and status.</p></div></div>
        <div><div className="stage crop"><Shot name="dashboard" sizes={sizes} alt="The Dashboard, labelled Sample data, showing evidence-backed answers and a needs-attention queue." /></div><div className="pt"><h3>Dashboard</h3><p>Shows which answers lean on evidence and which cases need an outcome. The figures in this demo are labelled sample data.</p></div></div>
      </div>
    </div></section>
  );
}

const rules = [
  ["A case is never called a violation.", "Memoba reports the difference and cites both sides."],
  ["Advice stays advice.", "A generated brief never becomes an observed outcome."],
  ["A failed search is never “no precedent”.", "A source that could not be searched is reported as unchecked."],
  ["A citation shows where a claim came from.", "It proves the agent read that section. It doesn’t prove the section supports the claim, so open it and judge."],
] as const;

export function Honesty() {
  return (
    <section className="honest" id="honest"><div className="wrap">
      <div className="head"><SectionTag n={6} name="What it won't say" /><h2>When they differ, you get both sides.</h2></div>
      <div className="hon">
        <div className="stage crop tall"><Shot name="answer-differ" sizes="(max-width: 900px) 100vw, 760px" alt="The answer section Where practice and process differ, followed by what is different this time and a suggested next step." /></div>
        <ul className="rules">{rules.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul>
      </div>
    </div></section>
  );
}

export function Close() {
  return (
    <footer className="end"><div className="wrap">
      <div className="head">
        <SectionTag n={7} name="Try it" />
        <h2>Ask the demo workspace a real question.</h2>
        <p>It holds 20 cases and five process documents from Northwind Ledger, a fictional invoicing company.</p>
        <Link className="btn" href="/login">Open the demo</Link>
      </div>
      <div className="big" aria-hidden="true">Memoba</div>
    </div><div className="band" aria-hidden="true" /></footer>
  );
}
