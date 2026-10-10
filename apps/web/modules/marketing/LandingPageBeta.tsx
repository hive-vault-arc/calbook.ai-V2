import englishTranslations from "@calcom/i18n/locales/en/common.json";
import { Icon } from "@calcom/ui/components/icon";
import Image from "next/image";
import type { CSSProperties, ReactElement } from "react";
import { BETA_WAITLIST_URL } from "./constants";
import styles from "./LandingPageBeta.module.css";
import { LandingScrollMotion } from "./LandingScrollMotion";

const workflowHeading = "EVERYTHING AROUND THE CONVERSATION, HANDLED.";
const workflowHeadingWords: { word: string; start: number }[] = workflowHeading
  .split(" ")
  .map((word, wordIndex, words) => ({
    word,
    start: words.slice(0, wordIndex).join("").length,
  }));

const faqs = [
  [
    "How do I get access?",
    "Apply through the beta form. We review applications manually and email an invitation to accepted teams.",
  ],
  [
    "Is the beta free?",
    "Yes. Applying and using an invited beta account are free. We will explain any paid plans before checkout opens.",
  ],
  [
    "Do candidates need a CalBook account?",
    "No. Candidates open the link you share, choose an available time, and receive their booking details by email.",
  ],
  [
    "Which meeting tools can we use?",
    "Connect your own calendar and supported meeting provider, including Google Meet, Microsoft Teams, or Zoom.",
  ],
] as const;

function Brand(): ReactElement {
  return (
    <span className={styles.brand}>
      <Image src="/calbook-icon.svg" alt="" width={31} height={31} priority />
      <span className="font-cal">
        CalBook<span className={styles.brandDot}>.ai</span>
      </span>
    </span>
  );
}

// An illustrative booking surface shows the actual workflow without presenting test data as customer proof.
function BookingScene(): ReactElement {
  return (
    <div
      className={styles.scene}
      role="img"
      aria-label="Illustration of a candidate selecting an interview time and receiving an invitation">
      <div className={styles.sceneGlow} />
      <div className={styles.sceneOrbit} />
      <span className={`${styles.orbitLabel} ${styles.orbitLabelLeft}`}>01 / CREATE</span>
      <span className={`${styles.orbitLabel} ${styles.orbitLabelRight}`}>03 / CONFIRM</span>
      <div className={styles.scenePanel}>
        <div className={styles.panelTop}>
          <span className={styles.panelDots}>
            <i />
            <i />
            <i />
          </span>
          <span>Candidate booking</span>
          <span className={styles.panelTopEnd}>calbook.ai</span>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.panelIntro}>
            <span className={styles.miniMark}>
              <Image src="/calbook-icon.svg" alt="" width={22} height={22} />
            </span>
            <span className={styles.panelKicker}>INTERVIEW WITH YOUR TEAM</span>
            <strong>Portfolio conversation</strong>
            <span>45 minutes · Video meeting</span>
          </div>
          <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
              <span>Select a day</span>
              <span>‹ &nbsp; ›</span>
            </div>
            <div className={styles.dayGrid}>
              {["MON", "TUE", "WED", "THU", "FRI"].map((day, index) => (
                <div key={day}>
                  <small>{day}</small>
                  <b>{12 + index}</b>
                </div>
              ))}
            </div>
            <div className={styles.slotGrid}>
              <span>9:00 AM</span>
              <span>10:30 AM</span>
              <strong>1:30 PM</strong>
              <span>3:00 PM</span>
            </div>
          </div>
        </div>
      </div>
      <div className={`${styles.sceneFloat} ${styles.templateFloat}`}>
        <span className={styles.floatIcon}>✳</span>
        <span>
          <small>INTERVIEW TEMPLATE</small>
          <strong>Ready to share</strong>
        </span>
      </div>
      <div className={`${styles.sceneFloat} ${styles.inviteFloat}`}>
        <span className={styles.sentIcon}>✓</span>
        <span>
          <small>CONFIRMATION</small>
          <strong>Invitation sent</strong>
        </span>
      </div>
      <span className={styles.sceneCaption}>Illustrative booking preview</span>
    </div>
  );
}

const steps = [
  {
    label: "01 / SET THE FORMAT",
    title: "ONE FORMAT. READY FOR EVERY CANDIDATE.",
    copy: "Build an interview template once, then keep a clear booking link ready for every person you meet.",
    points: [
      "Set the duration and hosts",
      "Reuse a consistent interview link",
      "Keep your team’s formats in order",
    ],
    visual: (
      <div className={styles.stepVisual} aria-hidden="true">
        <div className={styles.visualTop}>
          <span>Interview templates</span>
          <span>•••</span>
        </div>
        <div className={styles.templateRow}>
          <span className={styles.duration}>
            45<span>MIN</span>
          </span>
          <span>
            <b>Portfolio conversation</b>
            <small>One-to-one · 1 host</small>
          </span>
          <span className={styles.livePill}>Live</span>
        </div>
        <div className={styles.templateRow}>
          <span className={styles.durationMuted}>
            30<span>MIN</span>
          </span>
          <span>
            <b>First conversation</b>
            <small>One-to-one · 1 host</small>
          </span>
          <span className={styles.livePill}>Live</span>
        </div>
      </div>
    ),
  },
  {
    label: "02 / LET THEM BOOK",
    title: "A TIME THAT WORKS. NO EMAIL CHAIN.",
    copy: "Send a link or put the scheduler on your site. Candidates choose from the times your connected calendar makes available.",
    points: ["Share a link or embed it", "Show available times", "Let candidates book for themselves"],
    visual: (
      <div className={styles.stepVisual} aria-hidden="true">
        <div className={styles.visualTop}>
          <span>Choose a time</span>
          <span>Available this week</span>
        </div>
        <div className={styles.availabilityDays}>
          <span>
            MON
            <br />
            <b>12</b>
          </span>
          <span>
            TUE
            <br />
            <b>13</b>
          </span>
          <strong>
            WED
            <br />
            <b>14</b>
          </strong>
          <span>
            THU
            <br />
            <b>15</b>
          </span>
        </div>
        <div className={styles.availabilitySlots}>
          <span>10:30 AM</span>
          <strong>1:30 PM</strong>
          <span>3:00 PM</span>
        </div>
      </div>
    ),
  },
  {
    label: "03 / SHOW UP READY",
    title: "THE DETAILS LAND WITH EVERYONE.",
    copy: "Once a time is booked, the confirmation brings the meeting details together for the host and candidate.",
    points: [
      "Booking details by email",
      "Video links with connected tools",
      "Rescheduling when plans change",
    ],
    visual: (
      <div className={styles.stepVisual} aria-hidden="true">
        <div className={styles.visualTop}>
          <span>Booking confirmed</span>
          <span className={styles.confirmedCheck}>✓</span>
        </div>
        <div className={styles.confirmationCard}>
          <span className={styles.confirmationDate}>
            14
            <br />
            <small>OCT</small>
          </span>
          <span>
            <b>Portfolio conversation</b>
            <small>1:30 PM · Google Meet</small>
          </span>
        </div>
        <div className={styles.confirmationFooter}>
          <span>Invitation delivered</span>
          <span>↗</span>
        </div>
      </div>
    ),
  },
] as const;

export function LandingPageBeta(): ReactElement {
  return (
    <main className={styles.page}>
      <LandingScrollMotion />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="/" aria-label="CalBook.ai home">
            <Brand />
          </a>
          <nav aria-label="Main navigation" className={styles.nav}>
            <a href="#how-it-works">How it works</a>
            <a href="#beta">Beta access</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className={styles.headerActions}>
            <a href="/auth/login" className={styles.signIn}>
              Sign in
            </a>
            <a href={BETA_WAITLIST_URL} className={styles.headerCta}>
              <span>Apply for beta</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                ↗
              </span>
            </a>
          </div>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowDot} /> INTERVIEW SCHEDULING FOR RECRUITMENT TEAMS
          </p>
          <h1 className="font-cal">
            BOOK INTERVIEWS.
            <br />
            <span>NOT EMAIL THREADS.</span>
          </h1>
          <p className={styles.heroDescription}>
            CalBook.ai gives recruitment teams one place to share interview times, let candidates book, and
            send everyone the details.
          </p>
          <div className={styles.heroActions}>
            <a href={BETA_WAITLIST_URL} className={styles.primaryCta}>
              <span>Apply for beta</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            </a>
            <a href="#how-it-works" className={styles.textCta}>
              <span>See how it works</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                ↘
              </span>
            </a>
          </div>
          <p className={styles.betaNote}>Private beta · Free to apply · No card required</p>
        </div>
        <BookingScene />
      </section>

      <section className={styles.promise} aria-label="CalBook interview scheduling benefits">
        <p>FROM FIRST LINK TO CONFIRMED CALL</p>
        <div>
          <span>SET THE FORMAT</span>
          <span>SHARE A TIME</span>
          <span>SHOW UP READY</span>
        </div>
      </section>

      <section className={styles.workflow} id="how-it-works">
        <div className={styles.sectionIntro} data-calbook-reveal>
          <p className={styles.eyebrow}>THE INTERVIEW FLOW</p>
          <h2
            className="font-cal"
            aria-label={workflowHeading}
            data-calbook-scroll-fill
            style={{ "--letter-count": workflowHeading.replaceAll(" ", "").length } as CSSProperties}>
            {workflowHeadingWords.map(({ word, start }) => (
              <span key={word} aria-hidden="true">
                <span
                  className={styles.scrollFillWord}
                  style={{ "--word-start": start, "--word-length": word.length } as CSSProperties}>
                  {word}
                </span>{" "}
              </span>
            ))}
          </h2>
          <p>Three clear steps from your team’s interview format to a meeting on everyone’s calendar.</p>
        </div>
        <div className={styles.steps}>
          {steps.map((step) => (
            <article className={styles.step} key={step.label} data-calbook-reveal>
              <div className={styles.stepCopy}>
                <span className={styles.stepLabel}>{step.label}</span>
                <h3 className="font-cal">{step.title}</h3>
                <p>{step.copy}</p>
                <ul className={styles.stepPoints}>
                  {step.points.map((point) => (
                    <li key={point}>
                      <span aria-hidden="true">✓</span> {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.stepStage}>{step.visual}</div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.comparison} aria-labelledby="comparison-title">
        <div className={styles.comparisonInner} data-calbook-reveal>
          <p className={styles.eyebrow}>WHY CALBOOK</p>
          <h2 className="font-cal" id="comparison-title">
            <span>LESS ADMIN.</span>
            <span>MORE CONVERSATION.</span>
          </h2>
          <p className={styles.comparisonIntro}>
            Make the step between “let’s meet” and the actual conversation feel effortless.
          </p>
          <div className={styles.comparisonTable}>
            <div className={styles.comparisonHead}>
              <h3 className="font-cal">THE BACK-AND-FORTH</h3>
              <span className={styles.comparisonVs} aria-hidden="true">
                VS
              </span>
              <h3 className="font-cal">THE CALBOOK WAY</h3>
            </div>
            <div className={styles.comparisonRow}>
              <div className={styles.comparisonBefore}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ×
                </span>
                <span>Trade emails to find a time</span>
              </div>
              <div className={styles.comparisonAfter}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ✓
                </span>
                <strong>Candidates choose an available slot</strong>
              </div>
            </div>
            <div className={styles.comparisonRow}>
              <div className={styles.comparisonBefore}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ×
                </span>
                <span>Rebuild each interview invite</span>
              </div>
              <div className={styles.comparisonAfter}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ✓
                </span>
                <strong>Share a reusable interview template</strong>
              </div>
            </div>
            <div className={styles.comparisonRow}>
              <div className={styles.comparisonBefore}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ×
                </span>
                <span>Chase down meeting details</span>
              </div>
              <div className={styles.comparisonAfter}>
                <span className={styles.comparisonMark} aria-hidden="true">
                  ✓
                </span>
                <strong>Send the booking details together</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.integrations}
        id="integrations"
        aria-labelledby="integrations-title"
        data-calbook-reveal>
        <div>
          <p className={styles.eyebrow}>{englishTranslations.landing_integrations_label}</p>
          <h2 className="font-cal" id="integrations-title">
            {englishTranslations.landing_integrations_heading}
            <br />
            <span>{englishTranslations.landing_integrations_heading_accent}</span>
          </h2>
          <p>
            Connect your calendar and supported video meeting tools. Candidates get one simple booking
            experience.
          </p>
        </div>
        <div className={styles.integrationWall}>
          <span className="sr-only">Google Calendar, Google Meet, Microsoft Teams, Zoom</span>
          {[0, 1, 2].map((row) => (
            <div className={styles.integrationLane} key={row} aria-hidden="true">
              <div className={styles.integrationTrack}>
                {[0, 1].map((copy) => (
                  <div className={styles.integrationGroup} key={copy}>
                    {[
                      { name: "Google Calendar", slug: "googlecalendar" },
                      { name: "Google Meet", slug: "googlevideo" },
                      { name: "Microsoft Teams", slug: "office365video" },
                      { name: "Zoom", slug: "zoomvideo" },
                    ].map((app, index, apps) => {
                      const item = apps[(index + row) % apps.length];
                      return (
                        <div className={styles.integrationTile} key={app.slug} title={item.name}>
                          <Image src={`/app-store/${item.slug}/icon.svg`} alt="" width={48} height={48} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <label className={styles.integrationPause}>
            <input type="checkbox" />
            <span>{englishTranslations.landing_integrations_pause}</span>
          </label>
        </div>
      </section>

      <section className={styles.betaSection} id="beta">
        <div className={styles.betaInner} data-calbook-reveal>
          <div>
            <p className={styles.eyebrow}>PRIVATE BETA · LIMITED INVITES</p>
            <h2 className="font-cal">READY FOR A BETTER FIRST CONVERSATION?</h2>
          </div>
          <div className={styles.betaSide}>
            <p>
              Tell us about your team. We review applications manually and invite selected teams by email.
              Beta access is free; paid plans come later.
            </p>
            <a href={BETA_WAITLIST_URL} className={styles.lightCta}>
              <span>Apply for beta</span>
              <span className={styles.ctaIcon} aria-hidden="true">
                <Icon name="arrow-right" className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} id="faq">
        <div className={styles.faqIntro} data-calbook-reveal>
          <p className={styles.eyebrow}>GOOD TO KNOW</p>
          <h2 className="font-cal">QUESTIONS, ANSWERED.</h2>
          <p>A few practical answers about beta access and the booking experience.</p>
        </div>
        <div className={styles.faqList} data-calbook-reveal>
          {faqs.map(([question, answer]) => (
            <details key={question}>
              <summary>
                <span>{question}</span>
                <Icon name="plus" className="h-4 w-4" />
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Brand />
            <p>Better interview scheduling for recruitment teams and the people they meet.</p>
          </div>
          <div className={styles.footerLinks}>
            <a href="#how-it-works">How it works</a>
            <a href="#beta">Beta access</a>
            <a href="/auth/login">Sign in</a>
          </div>
          <div className={styles.footerLinks}>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} CalBook.ai</span>
          <span>Made for better first conversations.</span>
        </div>
      </footer>
    </main>
  );
}
