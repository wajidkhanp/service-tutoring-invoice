import { useState } from 'react';

const SECTIONS = [
  {
    title: 'Dashboard',
    faqs: [
      {
        q: 'What does the Dashboard show?',
        a: 'The Dashboard gives you a quick snapshot of your operation. The two stat cards show total active students and invoices generated for the current month. Quick Actions let you jump directly to Mark Attendance, Generate Invoice, Invoice History, or Manage Students. The Recent Activity feed logs every action — invoices created, emails sent, students added, attendance recorded — so you always have an audit trail.',
      },
      {
        q: 'Why is the invoice count not updating?',
        a: 'The count refreshes every time you navigate to the Dashboard. If you just generated invoices, tap Dashboard in the navbar and the number will reflect the latest data.',
      },
    ],
  },
  {
    title: 'Attendance',
    faqs: [
      {
        q: 'How do I mark attendance for the day?',
        a: 'Go to the Attendance page (or tap Mark Attendance on the Dashboard). The weekly grid shows all students grouped by boys and girls. Every student defaults to Present — you only need to tap a cell to mark it Absent (A) or Tardy (T). Tap again to cycle: Present → Absent → Tardy → Present. Changes save instantly.',
      },
      {
        q: 'How are students organized in the grid?',
        a: 'Students are separated into Boys and Girls sections based on the gender set in their profile. Use the All / Boys / Girls tabs at the top to filter the view. Within each section, students are listed alphabetically.',
      },
      {
        q: 'What does the ✓ checkmark in a column header do?',
        a: 'Tapping ✓ on a day column confirms that day as a school day where all students were present. This is useful when no absences or tardies need to be recorded — it marks the day in the system without entering data for each student.',
      },
      {
        q: 'Why are some cells grayed out?',
        a: 'Future dates are locked and cannot be edited — you can only record attendance for today or past school days. Cells before a student\'s join date are also locked (shown as n/a) since the student was not yet enrolled.',
      },
      {
        q: 'How does the monthly filter work?',
        a: 'The month selector above the grid only shows past and current months — no future months are listed. Select a month to view or edit attendance for that period. Weeks are grouped as Week 1, Week 2, etc. with Monday–Friday columns.',
      },
      {
        q: 'How do I view a student\'s full attendance history?',
        a: 'On the Attendance page, tap the student\'s name to go to their individual history page. Alternatively, go to Students, tap Details for a student, then tap View Attendance History. The history page shows a year summary (Present / Absent / Tardy / Attendance Rate %) and collapsible monthly sections with a week grid for each month.',
      },
      {
        q: 'What is the attendance rate and how is it calculated?',
        a: 'Attendance rate = (Present days ÷ Total school days) × 100. A school day is any date that has been recorded in the system (either confirmed all-present or has at least one absence/tardy entry). Weekends and school holidays are never counted.',
      },
      {
        q: 'How does the mobile attendance view work?',
        a: 'On phones (screen width ≤ 640 px) the weekly grid switches to a day-stack view. Each school day is listed as an expandable section. Tap a day to expand it and see all students with large P / A / T buttons for each.',
      },
    ],
  },
  {
    title: 'Managing Students',
    faqs: [
      {
        q: 'How do I add a student?',
        a: 'Go to the Students page and tap Add Student. Fill in the student\'s name, student email, gender, join date, grade, address, hourly rate, and parent contact info (name, phone, email). The parent email is used when sending invoice emails. Tap Add Student to save.',
      },
      {
        q: 'How do I view or edit a student\'s details?',
        a: 'On the Students page, tap Details for any student. This opens an overlay showing all their information including parent contacts. Tap Edit to update any field, then Save Changes. Changes take effect immediately.',
      },
      {
        q: 'Why does join date matter?',
        a: 'A student\'s join date locks attendance cells for any date before they enrolled — you cannot accidentally record attendance for a period the student wasn\'t attending. It also ensures attendance history only shows relevant school days.',
      },
      {
        q: 'How do I remove a student?',
        a: 'Open the student\'s detail overlay via Details, then tap Remove. This permanently deletes the student record. Existing invoices are not affected, but their attendance entries remain in the data file.',
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
        a: 'On the Settings page, find the Invoice Signature panel. Tap Choose File and select a PNG or JPEG image of your signature (recommended size: 300 × 100 px). A preview will appear — tap Upload Signature to save it. The signature will appear on all PDFs going forward.',
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
        q: 'How do I generate invoices for all students at once?',
        a: 'Go to the Generate page and tap Generate All. Select the billing month and year (only past and current months are available — future months are blocked). Optionally check Send email to parents to email each invoice automatically to parents who have an email on file. Tap Generate. The app creates one invoice per active student using their default hours, rate, and notes. Students with an existing invoice for that month are skipped.',
      },
      {
        q: 'How do I create a single invoice?',
        a: 'On the Generate page, tap Create Invoice. Select the student, billing month and year, due date, description, hours, and hourly rate. The total is calculated live. Optionally send an email to the parent, then tap Create Invoice.',
      },
      {
        q: 'Why can\'t I select a future month for invoices?',
        a: 'Invoice generation is restricted to past and current months only. This prevents accidentally generating invoices for billing periods that haven\'t happened yet. If you need to generate for the current month, make sure the correct month is selected.',
      },
      {
        q: 'How are PDFs downloaded?',
        a: 'PDFs are generated on demand — nothing is stored on the server disk. Use Download ZIP on the Generate page to bundle all invoices for a month into one file. On the Invoice History page, each invoice card has an individual Download button.',
      },
      {
        q: 'How do I send an invoice by email?',
        a: 'Email can be sent three ways: (1) check Send email to parent when creating a single invoice, (2) check Send email to parents when using Generate All, or (3) tap Send Email on any invoice card in Invoice History to re-send at any time.',
      },
    ],
  },
  {
    title: 'Invoice History',
    faqs: [
      {
        q: 'How do I browse past invoices?',
        a: 'Go to the History page. The Billing Period dropdown shows only months where invoices actually exist — select any period to view its invoices. The list updates instantly without a page reload.',
      },
      {
        q: 'How do I download a ZIP of all invoices for a month?',
        a: 'On the History page, select the billing period, then tap Download ZIP. The server generates all the PDFs on the fly and bundles them into a single ZIP file that downloads to your device.',
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
