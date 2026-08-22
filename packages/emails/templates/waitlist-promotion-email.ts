import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import BaseEmail from "./_base-email";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });

type WaitlistPromotionEmailProps = {
  to: string;
  name: string | null;
  eventTitle: string;
  organizerName: string;
  slotTime: string;
  slotEndTime?: string;
  tier?: string;
  bookingLink: string;
  expiresAt: string;
};

export default class WaitlistPromotionEmail extends BaseEmail {
  name = "waitlist-promotion-email";
  private props: WaitlistPromotionEmailProps;

  constructor(props: WaitlistPromotionEmailProps) {
    super();
    this.props = props;
  }

  protected getTimezone() {
    return "";
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const slotDate = dayjs(this.props.slotTime).format("dddd, MMMM D, YYYY");
    const slotTimeStr = dayjs(this.props.slotTime).format("h:mm A");
    const expiryTime = dayjs(this.props.expiresAt).format("h:mm A");

    const subject = `A spot opened up: ${this.props.eventTitle} on ${slotDate}`;
    const recipientName = this.props.name || this.props.to.split("@")[0];
    const safeRecipientName = escapeHtml(recipientName);
    const safeEventTitle = escapeHtml(this.props.eventTitle);
    const safeOrganizerName = escapeHtml(this.props.organizerName);
    const safeTier = this.props.tier ? escapeHtml(this.props.tier) : null;
    const safeBookingLink = escapeHtml(this.props.bookingLink);

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Good news, ${safeRecipientName}!</h2>
        <p>A spot just opened up for <strong>${safeEventTitle}</strong> with ${safeOrganizerName}.</p>
        <p><strong>When:</strong> ${slotDate} at ${slotTimeStr}</p>
        ${safeTier ? `<p><strong>Tier:</strong> ${safeTier}</p>` : ""}
        <p>You have until <strong>${expiryTime}</strong> to claim this spot.</p>
        <div style="margin: 24px 0;">
          <a href="${safeBookingLink}"
             style="background-color: #FBBF24; color: #1C1C1C; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
            Book this slot now
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          This link expires in 2 hours. If you no longer need this slot, you can ignore this email.
        </p>
      </div>
    `;

    return {
      to: `${recipientName} <${this.props.to}>`,
      from: `${this.props.organizerName} <${this.getMailerOptions().from}>`,
      subject,
      html,
      text: `A spot opened up for ${this.props.eventTitle} with ${this.props.organizerName} on ${slotDate} at ${slotTimeStr}. Book now: ${this.props.bookingLink}. This link expires in 2 hours.`,
    };
  }
}

const log = logger.getSubLogger({ prefix: ["waitlist-email"] });

export async function sendWaitlistPromotionEmail(props: WaitlistPromotionEmailProps): Promise<void> {
  try {
    const email = new WaitlistPromotionEmail(props);
    await email.sendEmail();
    log.info("Waitlist promotion email sent", { to: props.to, eventTitle: props.eventTitle });
  } catch (error) {
    log.error("Failed to send waitlist promotion email", { to: props.to, error });
    // Don't throw — email failure shouldn't break the promotion flow
  }
}
