import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — Briefcase",
  description: "How Briefcase collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 13, 2026">
      <p>
        This Privacy Policy explains how [YOUR LEGAL ENTITY] (&quot;Briefcase,&quot; &quot;we,&quot;
        &quot;us&quot;) collects, uses, and protects your information when you use Briefcase at
        briefcasecareer.com and its related services (the &quot;Service&quot;). By using the Service,
        you agree to the practices described here.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information.</strong> When you sign up, our authentication provider (Clerk)
          collects your email address and name, and any details you add to your profile.
        </li>
        <li>
          <strong>Content you provide.</strong> Your experience bank (jobs, projects, education,
          certifications, and the bullets and skills within them), any resume files you upload, job
          descriptions you paste, and the cover letters and resumes generated for you.
        </li>
        <li>
          <strong>Usage and technical data.</strong> Basic information such as your application
          activity within the Service and standard server logs (for example, IP address and request
          metadata) used to operate and secure the Service.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To provide the Service: storing your experience bank and generating tailored documents.</li>
        <li>To compute fit scores, retrieve relevant experience, and analyze keyword gaps.</li>
        <li>To authenticate you and keep your account and data secure.</li>
        <li>To operate, maintain, debug, and improve the Service.</li>
        <li>To communicate with you about your account or important changes to the Service.</li>
      </ul>

      <h2>AI processing</h2>
      <p>
        Briefcase uses third-party AI services (currently OpenAI) to generate embeddings and to
        produce cover letters and resumes. When you generate or import content, the relevant text
        (such as your experience entries and pasted job descriptions) is sent to that provider to
        return a result. We do not use your content to train our own models. The AI provider&apos;s
        handling of data is governed by its own terms and policies.
      </p>

      <h2>Service providers</h2>
      <p>We share data with a limited set of processors solely to run the Service:</p>
      <ul>
        <li>
          <strong>Clerk</strong> — authentication and account management.
        </li>
        <li>
          <strong>OpenAI</strong> — AI generation and embeddings.
        </li>
        <li>
          <strong>Railway</strong> — backend hosting and database storage.
        </li>
        <li>
          <strong>Vercel</strong> — frontend hosting.
        </li>
      </ul>
      <p>
        We do not sell your personal information, and we do not share it with third parties for their
        own marketing.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain your account and content for as long as your account is active. You can delete
        individual experience entries and applications at any time. If you delete your account, we
        delete or anonymize your associated content within a reasonable period, except where we are
        required to retain it by law.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, correct, export, or delete your
        personal data, and to object to or restrict certain processing. You can exercise many of
        these directly in the app, or contact us at the address below. To delete your account, use
        your account menu or email us.
      </p>

      <h2>Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encrypted transport (HTTPS),
        authenticated and per-user access controls, and reputable infrastructure providers. No method
        of transmission or storage is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Children</h2>
      <p>
        The Service is not directed to children under 16, and we do not knowingly collect personal
        information from them.
      </p>

      <h2>International users</h2>
      <p>
        Your data may be processed and stored in countries other than your own, including the United
        States. By using the Service, you consent to such transfers.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. When we do, we will revise the
        &quot;Last updated&quot; date above, and material changes may be communicated to you.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data? Contact us at{" "}
        <a href="mailto:support@briefcasecareer.com">support@briefcasecareer.com</a>.
      </p>
    </LegalLayout>
  );
}
