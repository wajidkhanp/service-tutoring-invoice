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
    title: 'Daily Class',
    faqs: [
      {
        q: 'What is the Daily Class page?',
        a: 'The Daily Class page is your primary tool for each class session. It shows all students for today (or a selected past date) with Present / Absent / Tardy buttons, plus a Log Progress button to record each student\'s Quran progress for that day. Use the date navigation arrows to review or update any past school day.',
      },
      {
        q: 'How do I mark attendance on the Daily page?',
        a: 'Each student card shows three buttons: Present, Absent, and Tardy. The first tap on any button records the day and sets that student\'s status. All students default to Present — you only need to tap Absent or Tardy for exceptions. Changes save to the server instantly.',
      },
      {
        q: 'How does the schedule work for boys and girls?',
        a: 'Sundays are off for all students. Fridays are additionally off for female students. On the Daily page, female students automatically show a "No class today" card on Fridays instead of attendance buttons. The date navigator skips Sundays automatically when you press the back/forward arrows.',
      },
      {
        q: 'How do I mark a day as a Holiday?',
        a: 'On the Daily page, tap the Holiday button in the top-right area of the header. The day is immediately marked as a holiday and a banner replaces the student cards. Tap Remove Holiday to undo. Holidays are shared across the whole system — attendance and report card calculations both exclude holiday dates.',
      },
      {
        q: 'Can I record attendance for a past date?',
        a: 'Yes. Use the left arrow (◀) in the date navigator to go back to any past weekday. The page loads that day\'s data and lets you add or correct attendance and progress entries. Future dates are locked (read-only).',
      },
    ],
  },
  {
    title: 'Progress Logging',
    faqs: [
      {
        q: 'How do I log a student\'s Quran progress?',
        a: 'On the Daily Class page, tap Log Progress (or + Log Progress) on any student card. This opens the Progress Log panel for that student and date. You can record New Lesson, Sabqi, Manzil, Akhlaq, Stars earned, and any special Achievement. Tap Save Progress when done.',
      },
      {
        q: 'What is New Lesson and how do I record it?',
        a: 'New Lesson tracks which Surah the student memorised that day. Select the Surah from the dropdown, then enter the From Ayah, To Ayah, and number of Lines. If no new lesson was given, leave the dropdown at "No new lesson today". Special statuses are also available: Missed (student missed their lesson), Did Not Pass (student could not pass their previous lesson), and No lesson · Juzz Completed (a milestone — student finished a full Juzz).',
      },
      {
        q: 'What is Sabqi?',
        a: 'Sabqi is the daily revision of recently memorised portions. Tap Yes if the student recited Sabqi today, or No if they did not. When you tap Yes, a sub-rating appears — choose Good or Needs Improvement to record the quality of the recitation.',
      },
      {
        q: 'What is Manzil?',
        a: 'Manzil is revision of previously memorised Juzz. Tap Yes if the student recited Manzil today. Then select the Juzz number, optionally select a specific Surah within that Juzz, and enter free-text details (e.g. "Juzz 3 from Al-Baqarah"). After you type 5 or more characters in the details field, a Good / Needs Improvement rating appears so you can rate the recitation quality.',
      },
      {
        q: 'What are Stars, Akhlaq, and Achievement?',
        a: 'Stars (1–5) are awarded for the student\'s overall performance that day — tap the star icons or use the +/− buttons. Akhlaq records the student\'s character and behaviour: choose Good or Needs Improvement. Achievement is a free-text field for any special note (e.g. "Memorised full Surah Al-Ikhlas"). All three are optional and feed into the monthly report card.',
      },
      {
        q: 'How do I view and edit progress for a whole week?',
        a: 'Tap Log Progress on any student card to open the Weekly Progress Panel. This shows a full Mon–Sat table (or scrollable day cards on mobile) for that student\'s week. Each row displays New Lesson, Sabqi, Manzil, Akhlaq, Stars, and Remarks at a glance. Tap any past or current day row (or the Edit button on mobile) to open the Progress Log panel for that specific day. Use the week navigation arrows to move between weeks.',
      },
      {
        q: 'Are future days editable in the weekly view?',
        a: 'No. Future dates are locked — they display dashes and have no tap/edit action. Only today and past school days can be edited. Days that are off (Sunday for all, Friday for girls) and holidays are shown as grayed-out "No class" or "Holiday" rows.',
      },
    ],
  },
  {
    title: 'Attendance',
    faqs: [
      {
        q: 'How do I view the full attendance grid?',
        a: 'Go to the Attendance page. The weekly grid shows all students grouped by Boys and Girls across a Mon–Sat week. Every student defaults to Present — tap a cell to cycle through Present → Absent → Tardy → Present. Changes save instantly.',
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
        a: 'Future dates are locked and cannot be edited. Cells before a student\'s join date are locked (shown as n/a) since the student was not yet enrolled. Holiday dates are also locked — they are excluded from all attendance calculations.',
      },
      {
        q: 'How does the schedule work for boys and girls?',
        a: 'All students have Sundays off. Female students additionally have Fridays off — their Friday cells show "Off" and are not counted in attendance totals. The school week runs Monday through Saturday.',
      },
      {
        q: 'How do I mark a day as a Holiday in the attendance grid?',
        a: 'Holiday marking is done from the Daily Class page — navigate to the date and tap the Holiday button. The holiday flag applies system-wide: the attendance grid, daily page, weekly progress view, and report card calculations all recognise and exclude it.',
      },
      {
        q: 'How does the monthly filter work?',
        a: 'The month selector above the grid only shows past and current months. Select a month to view or edit attendance for that period. Weeks are grouped as Week 1, Week 2, etc. with Monday–Saturday columns.',
      },
      {
        q: 'How do I view a student\'s full attendance history?',
        a: 'On the Attendance page, tap the student\'s name to go to their individual history page. Alternatively, go to Students, tap Details for a student, then tap View Attendance History. The history page shows a year summary (Present / Absent / Tardy / Attendance Rate %) and collapsible monthly sections with a week grid for each month.',
      },
      {
        q: 'What is the attendance rate and how is it calculated?',
        a: 'Attendance rate = (Present days ÷ Total school days) × 100. A school day is any date recorded in the system (confirmed all-present or has at least one absence/tardy entry). Weekends, off-schedule days (Friday for girls), and holidays are never counted.',
      },
    ],
  },
  {
    title: 'Report Cards',
    faqs: [
      {
        q: 'What are Report Cards?',
        a: 'Report Cards are monthly summaries for each student covering Attendance, New Lesson progress, Sabqi, Manzil, Akhlaq, Stars earned, and Teacher Remarks. They can be generated as PDFs and emailed directly to parents.',
      },
      {
        q: 'How do I create report cards for a month?',
        a: 'Go to the Report Cards page and select the month and year. Tap Generate All to create draft report cards for all students in one click. Existing cards for that month are skipped. You can also create a single card by tapping New Report Card and selecting the student.',
      },
      {
        q: 'Are report cards auto-filled from daily progress data?',
        a: 'Yes. When a report card is created, the system automatically fills attendance totals from the attendance records and populates progress fields from the daily progress logs: lines completed (New Lesson), days recited vs. missed (Sabqi), weekly Manzil coverage, overall Sabqi and Manzil ratings (based on majority Good/Needs Improvement), total Stars earned, achievements noted, and Akhlaq majority rating. You can review and edit any field before finalising.',
      },
      {
        q: 'How do Sabqi and Manzil ratings work in report cards?',
        a: 'Each daily progress entry records a Good or Needs Improvement rating for Sabqi and Manzil. The report card uses the majority rating across the month — if more days were rated Good than Needs Improvement, the report card shows Good, and vice versa.',
      },
      {
        q: 'How do I edit a report card?',
        a: 'Open the report card and tap Edit. All fields are editable: attendance counts, progress details (target lines, target Ajza, ratings, notes), stars, achievements, remarks, and teacher name. Tap Save when finished. The card stays in Draft status until you mark it final.',
      },
      {
        q: 'How do I download a report card as a PDF?',
        a: 'Open any report card and tap Download PDF. The server generates a formatted PDF on the fly and downloads it to your device. The PDF includes the organization header, student details, attendance summary, progress sections, stars, and signature.',
      },
      {
        q: 'How do I email a report card to parents?',
        a: 'Open the report card and tap Send Email. The system generates the PDF, attaches it, and sends it to the parent email address on file for that student. The card is automatically marked as Sent with a timestamp. If no parent email is on file, add one in the student\'s profile first.',
      },
      {
        q: 'What is the difference between Draft and Sent status?',
        a: 'Draft means the report card has been created but not yet emailed to the parent. Sent means the email was successfully delivered — the sent timestamp is recorded. You can still edit and re-send a card that has already been sent.',
      },
    ],
  },
  {
    title: 'Managing Students',
    faqs: [
      {
        q: 'How do I add a student?',
        a: 'Go to the Students page and tap Add Student. Fill in the student\'s name, student email, gender, join date, grade, address, hourly rate, and parent contact info (name, phone, email). The parent email is used when sending invoice and report card emails. Tap Add Student to save.',
      },
      {
        q: 'How does gender affect the class schedule?',
        a: 'Gender determines which days a student has class. Male students attend Monday–Saturday (Sundays off). Female students attend Monday–Thursday and Saturday (Sundays and Fridays off). The Daily page, weekly progress view, and attendance grid all automatically respect this schedule — female students show "No class" on Fridays.',
      },
      {
        q: 'How do I view or edit a student\'s details?',
        a: 'On the Students page, tap Details for any student. This opens an overlay showing all their information including parent contacts. Tap Edit to update any field, then Save Changes. Changes take effect immediately.',
      },
      {
        q: 'Why does join date matter?',
        a: 'A student\'s join date locks attendance cells for any date before they enrolled — you cannot accidentally record attendance for a period the student wasn\'t attending. It also ensures attendance history and report card calculations only include relevant school days.',
      },
      {
        q: 'How do I remove a student?',
        a: 'Open the student\'s detail overlay via Details, then tap Remove. This permanently deletes the student record. Existing invoices and report cards are not affected, but their attendance and progress entries remain in the data file.',
      },
    ],
  },
  {
    title: 'Organization Setup & Signature',
    faqs: [
      {
        q: 'How do I set up my organization information?',
        a: 'Go to Settings in the navbar. The Organization Information panel shows your current details — name, address, phone, email, EIN, and representative name. Tap Edit to update any field, then Save Changes. These details appear in the header of every generated PDF invoice and report card.',
      },
      {
        q: 'How do I upload a signature?',
        a: 'On the Settings page, find the Invoice Signature panel. Tap Choose File and select a PNG or JPEG image of your signature (recommended size: 300 × 100 px). A preview will appear — tap Upload Signature to save it. The signature will appear on all invoices and report card PDFs going forward.',
      },
      {
        q: 'What happens if I don\'t upload a signature?',
        a: 'If no signature image is on file, the PDF will show a simple signature line in its place. The document is still fully valid — the signature image is optional.',
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
        a: 'Invoice generation is restricted to past and current months only. This prevents accidentally generating invoices for billing periods that haven\'t happened yet.',
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
