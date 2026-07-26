import { Html } from "@elysia/html";

import { votingFeLink } from "@tora-chain/configs";

// Force the JSX factory import to be treated as used.
void Html;

const TERMS_URL = `${votingFeLink}/legal/terms-and-conditions`;
const PRIVACY_URL = `${votingFeLink}/legal/privacy-policy`;

/**
 * Required "I accept the Terms & Conditions" checkbox, used on registration
 * only — signing in does not re-ask for consent already given at sign-up. It
 * carries no `name`, so it is excluded from the submitted JSON body, and
 * `required`, so the browser's native form validation blocks submission until
 * it is checked. The form does nothing until the box is ticked.
 */
export function TermsCheckbox() {
  return (
    <label class="terms">
      <input type="checkbox" id="accept-terms" required />
      <span>
        I accept the{" "}
        <a href={TERMS_URL} target="_blank" rel="noreferrer">
          Terms &amp; Conditions
        </a>{" "}
        and{" "}
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}
