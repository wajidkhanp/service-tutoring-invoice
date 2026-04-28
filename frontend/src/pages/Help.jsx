import { useState } from 'react';

const SECTIONS = [
  {
    title: 'Dashboard',
    faqs: [
      {
        q: 'What does the Dashboard show?',
        a: 'The Dashboard gives you a quick snapshot of your tutoring operation. The two stat cards show the total number of active students and the number of invoices generated for the current month. The Recent Activity feed on the right logs every action taken — invoices created, emails sent, students added — so you always have an audit trail.',
      },
      {
        q: 'Why is the invoice count not updating?',
        a: 'The count refreshes every time you navigate to the Dashboard. If you just generated invoices, click Dashboard in the navbar and the number will reflect the latest data.',
      },
    ],
  },
  {
    title: 'Managing Students',
    faqs: [
      {
        q: 'How do I add a student?',
        a: 'Go to the Students page and tap Add Student at the top right. Fill in the student\'s name, email (used for invoice emails), grade, address, hourly rate, default hours per month, and optional notes. The notes field becomes the invoice description when generating bulk invoices. Tap Save to add the student.',
      },
      {
        q: 'How do I view or edit a student\'s details?',
        a: 'On the Students page, find the student in the table and tap View Details. This opens an overlay showing all their information. Tap Edit to update any field, then Save. Changes take effect immediately on the next invoice generated for that student.',
      },
      {
        q: 'How do I remove a student?',
        a: 'Open the student\'s detail overlay via View Details, then tap Remove Student at the bottom. This permanently deletes the student record. Existing invoices for that student are not affected.',
      },
      {
        q: 'What is the default hours field used for?',
        a: 'When you use Generate All to create invoices for all students at once, the app uses each student\'s default hours and hourly rate to calculate the invoice amount automatically. You can override both fields when creating a single ad hoc invoice.',
      },
    ],
  },
  {
    title: 'Organization Setup & Signature',
    faqs: [
      {
        q: 'How do I set up my organization information?',
        a: 'Go to Settings in the navbar. The Organization Information panel shows your current details — name, address, phone, email, EIN, and representative name. Tap Edit to update any field, then Save Changes. These details appear in the header of every generated PDF invoice.',
      },
      {
        q: 'How do I upload a signature?',
        a: 'On the Settings page, find the Invoice Signature panel on the right. Tap Choose File and select a PNG or JPEG image of your signature (recommended size: 300 × 100 px). A preview will appear — tap Upload Signature to save it. The signature will appear on all PDFs going forward. You can replace or remove it at any time.',
      },
      {
        q: 'What happens if I don\'t upload a signature?',
        a: 'If no signature image is on file, the PDF will show a simple signature line in its place. The invoice is still fully valid — the signature image is optional.',
      },
    ],
  },
  {
    title: 'Generating Invoices',
    faqs: [
      {
        q: 'How do I generate invoices for all students at once (bulk / monthly)?',
        a: 'Go to the Generate page and tap Generate All. An overlay will appear — select the billing month and year, then optionally check Send email to parents to email each invoice automatically to parents who have an email on file. Tap Generate. The app creates one invoice per active student using their default hours, rate, and notes. Students who already have an invoice for that month are skipped to avoid duplicates.',
      },
      {
        q: 'How do I create a single ad hoc invoice?',
        a: 'On the Generate page, tap Create Invoice. Select the student, choose the billing month and year, set a due date, write a description, and enter the hours and hourly rate. The total amount is calculated live. Optionally check Send email to parent (only available if the student has an email on file), then tap Create Invoice.',
      },
      {
        q: 'How are invoice PDFs downloaded?',
        a: 'PDFs are generated on demand — nothing is stored on the server disk. On the Generate page, click the Download ZIP button to bundle all invoices for a selected month into a single ZIP file. On the Invoice History page, each invoice card has an individual Download button to get a single PDF.',
      },
      {
        q: 'How do I send an invoice by email?',
        a: 'Email can be sent in three ways: (1) check Send email to parent when creating a single invoice, (2) check Send email to parents when using Generate All, or (3) tap Send Email on any invoice card in Invoice History to re-send at any time. Email requires a Gmail App Password to be configured in the server environment.',
      },
      {
        q: 'What is a Gmail App Password and how do I set it up?',
        a: 'A Gmail App Password is a 16-character code that lets the app send email on your behalf without using your main Google password. Go to myaccount.google.com, search for App Passwords, create one for "Mail", and copy the code into the GMAIL_APP_PASSWORD field in the backend .env file. Restart the server after saving.',
      },
    ],
  },
  {
    title: 'Invoice History',
    faqs: [
      {
        q: 'How do I browse past invoices?',
        a: 'Go to the History page. Use the Month and Year dropdowns to filter invoices for any period, then tap Refresh. Each invoice card shows the student name, description, amount, and status.',
      },
      {
        q: 'How do I download a ZIP of all invoices for a month?',
        a: 'On the History page, select the month and year, then tap Download ZIP. The server generates all the PDFs on the fly and bundles them into a single ZIP file that downloads to your device.',
      },
      {
        q: 'How do I export invoices to a spreadsheet?',
        a: 'Tap Export CSV on the History page. This downloads a comma-separated file for the selected month containing invoice number, student name, description, hours, rate, amount, due date, status, and creation date. Open it in Excel, Numbers, or Google Sheets.',
      },
      {
        q: 'Can I re-send an email for an old invoice?',
        a: 'Yes. On the History page, find the invoice and tap Send Email. The app regenerates the PDF, attaches it, and sends a fresh email to the parent\'s address on file.',
      },
    ],
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? ' faq-item-open' : ''}`}>
      <button className="faq-question" onClick={() => setOpen((v) => !v)} type="button">
        <span>{q}</span>
        <span className="faq-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

export default function Help() {
  return (
    <div className="page">
      <div className="page-header">
        <h2>Help & FAQ</h2>
        <p className="page-subtitle">Answers to common questions about using the Noor Tutoring Invoice Manager.</p>
      </div>

      <div className="help-sections">
        {SECTIONS.map((section) => (
          <div key={section.title} className="panel">
            <div className="panel-header">
              <h3>{section.title}</h3>
            </div>
            <div className="panel-body faq-list">
              {section.faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
