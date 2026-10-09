import { Link } from 'react-router-dom';
import { Icon, type IconName } from '../components/dashboard/Icon';

/**
 * The hiring stages, in order. The hero illustration draws one column per
 * stage with abstract cards — never names or counts: the product has no
 * customers yet, and the landing page must not invent evidence (PRODUCT.md).
 */
const STAGES: { name: string; cards: number }[] = [
  { name: 'Applied', cards: 3 },
  { name: 'Screening', cards: 2 },
  { name: 'Interview', cards: 2 },
  { name: 'Offer', cards: 1 },
  { name: 'Hired', cards: 1 },
];

/** Every line here is a shipped capability, not a roadmap item. */
const AUDIENCES: {
  id: string;
  icon: IconName;
  title: string;
  lede: string;
  points: string[];
  cta: { to: string; label: string; ghost?: boolean };
}[] = [
  {
    id: 'employers',
    icon: 'building',
    title: 'For employers',
    lede: 'Create your company workspace, invite your hiring team, and manage your pipeline end to end.',
    points: [
      'A private workspace for your company',
      'Invite HR managers and interviewers with role-based access',
      'Publish vacancies to the public job board',
      'Collect applications and CVs in one place',
    ],
    cta: { to: '/register', label: 'Register your company' },
  },
  {
    id: 'seekers',
    icon: 'user',
    title: 'For job seekers',
    lede: 'Create one candidate account, apply to every company hiring on TalentPipe, and get discovered again.',
    points: [
      'One account for every company on TalentPipe',
      'Search and filter open roles by type and workplace',
      'Apply with your CV in a few minutes',
      'Keep a profile hiring teams can find again',
    ],
    cta: { to: '/register-candidate', label: 'Create a candidate account', ghost: true },
  },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'building',
    title: 'Create your workspace',
    text: 'Register your company and become its first administrator.',
  },
  {
    icon: 'user-plus',
    title: 'Invite your hiring team',
    text: 'Send email invitations, each with the right role for that person.',
  },
  {
    icon: 'briefcase',
    title: 'Publish roles and hire',
    text: 'Post vacancies to the job board and review every application in one place.',
  },
];

function PipelineIllustration() {
  return (
    <div className="tp-landing-board" aria-hidden="true">
      <div className="tp-landing-board-bar">
        <span />
        <span />
        <span />
      </div>
      <div className="tp-landing-board-columns">
        {STAGES.map((stage, index) => (
          <div key={stage.name} className="tp-landing-board-column">
            <span className="tp-landing-board-stage">{stage.name}</span>
            {Array.from({ length: stage.cards }, (_, card) => (
              <div
                key={card}
                className={
                  index === STAGES.length - 1 ? 'tp-landing-board-card is-hired' : 'tp-landing-board-card'
                }
              >
                <span className="tp-landing-board-avatar" />
                <span className="tp-landing-board-lines">
                  <span />
                  <span />
                </span>
                {index === STAGES.length - 1 && <Icon name="check" size={14} />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Public landing page: the pitch, a clear door per audience, and how it works. */
export function LandingPage() {
  return (
    <div className="tp-landing">
      <section className="tp-landing-hero" aria-labelledby="landing-title">
        <div className="tp-landing-hero-copy">
          <span className="tp-jobs-hero-eyebrow">TalentPipe</span>
          <h1 id="landing-title">Hire as a team, from one shared pipeline.</h1>
          <p className="tp-landing-hero-lede">
            The multi-tenant recruitment intelligence platform — one place for your jobs, candidates and
            hiring pipeline.
          </p>
          <div className="tp-landing-actions">
            <Link to="/register" className="tp-cta-link tp-cta-link-light">
              Register your company
            </Link>
            <Link to="/jobs" className="tp-cta-link tp-cta-link-glass">
              Browse open positions
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>
          <p className="tp-landing-hero-note">
            Looking for work? <Link to="/register-candidate">Create a candidate account</Link>
          </p>
        </div>
        <PipelineIllustration />
        <span aria-hidden="true" className="tp-jobs-hero-orb tp-jobs-hero-orb-one" />
      </section>

      <section className="tp-landing-section" aria-labelledby="landing-audiences">
        <header className="tp-landing-section-head">
          <span className="tp-jobs-section-eyebrow">Two ways in</span>
          <h2 id="landing-audiences">Built for both sides of hiring</h2>
        </header>
        <div className="tp-landing-audiences">
          {AUDIENCES.map((audience) => (
            <article key={audience.id} className="tp-landing-audience">
              <span className="tp-landing-icon">
                <Icon name={audience.icon} size={22} />
              </span>
              <h3>{audience.title}</h3>
              <p>{audience.lede}</p>
              <ul className="tp-landing-points">
                {audience.points.map((point) => (
                  <li key={point}>
                    <Icon name="check" size={16} />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                to={audience.cta.to}
                className={audience.cta.ghost ? 'tp-cta-link tp-cta-link-ghost' : 'tp-cta-link'}
              >
                {audience.cta.label}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="tp-landing-section" aria-labelledby="landing-steps">
        <header className="tp-landing-section-head">
          <span className="tp-jobs-section-eyebrow">How it works</span>
          <h2 id="landing-steps">From sign-up to first hire in three steps</h2>
        </header>
        <ol className="tp-landing-steps">
          {STEPS.map((step, index) => (
            <li key={step.title} className="tp-landing-step">
              <span className="tp-landing-step-number">{index + 1}</span>
              <span className="tp-landing-icon">
                <Icon name={step.icon} size={22} />
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="tp-landing-cta" aria-labelledby="landing-cta">
        <div>
          <h2 id="landing-cta">Ready to set up your hiring workspace?</h2>
          <p>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
        <div className="tp-landing-actions">
          <Link to="/register" className="tp-cta-link">
            Register your company
          </Link>
          <Link to="/register-candidate" className="tp-cta-link tp-cta-link-ghost">
            Create a candidate account
          </Link>
        </div>
      </section>
    </div>
  );
}
