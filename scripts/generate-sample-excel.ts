/**
 * Run once to create data/bench-buddy.xlsx with sample Q&A data.
 * Usage: npx ts-node scripts/generate-sample-excel.ts
 */
import * as XLSX from 'xlsx';
import path from 'path';

const rows = [
  {
    Question: 'How does bench allocation work?',
    Answer:
      'Bench allocation is the process of assigning available employees (those not currently on a billable project) to new opportunities. HR and resource managers review skills, experience, and availability to match employees with upcoming projects. Employees on the bench are expected to engage in training, internal projects, or pre-sales activities.',
    Category: 'Bench Management',
  },
  {
    Question: 'How long can an employee stay on the bench?',
    Answer:
      'Typically, employees can remain on the bench for up to 60 days while resource managers actively seek new project placements. Extensions may be granted for high-demand skill sets or employees undergoing mandatory training. After 60 days, further review meetings are scheduled with the employee and their manager.',
    Category: 'Bench Policy',
  },
  {
    Question: 'What activities should I do while on the bench?',
    Answer:
      'While on the bench, employees are encouraged to: complete mandatory training certifications, contribute to internal projects, participate in pre-sales POCs, upskill in emerging technologies, and assist with knowledge transfer sessions. These activities keep skills sharp and improve project-match probability.',
    Category: 'Bench Activities',
  },
  {
    Question: 'Will I receive full salary while on the bench?',
    Answer:
      'Yes. Employees on the bench continue to receive their full salary and benefits. Bench time is considered an investment by the company in workforce development and readiness.',
    Category: 'Compensation',
  },
  {
    Question: 'How are bench employees matched to new projects?',
    Answer:
      'Resource managers use a combination of skill matrix data, employee CVs, project requirements, and direct discussions with delivery managers to match bench employees to new opportunities. Employees can also self-nominate for projects visible on the internal staffing portal.',
    Category: 'Resource Management',
  },
  {
    Question: 'Can I apply for projects myself while on the bench?',
    Answer:
      'Yes. Employees have access to the internal staffing portal where open positions and project requirements are listed. You can apply directly, and your resource manager will be notified. Proactive applications are encouraged.',
    Category: 'Self-Service',
  },
  {
    Question: 'What happens if I reject a project offer while on the bench?',
    Answer:
      'Rejecting a project offer requires a valid reason (e.g., location, technology mismatch). Repeated rejections without valid reasons may be escalated to HR and may affect performance reviews. It is recommended to discuss concerns with your resource manager before declining.',
    Category: 'Bench Policy',
  },
  {
    Question: 'Who is my point of contact while I am on the bench?',
    Answer:
      'Your primary contact is your assigned Resource Manager (RM). They oversee your placement, provide updates on opportunities, and can escalate urgent concerns to HR. You can also reach out to your direct line manager for career guidance.',
    Category: 'Contacts',
  },
  {
    Question: 'Are there training budgets available for bench employees?',
    Answer:
      'Yes. Bench employees are eligible for accelerated access to the learning and development budget. Priority is given to certifications in high-demand skill areas. Speak with your Resource Manager or L&D team for approved course lists and reimbursement procedures.',
    Category: 'Learning & Development',
  },
  {
    Question: 'How do I update my skills profile for better project matching?',
    Answer:
      'Log in to the internal HR portal and navigate to My Profile > Skills & Certifications. Keep your skill ratings current, add new certifications, and list your technology preferences. An up-to-date profile significantly increases your chances of a quick placement.',
    Category: 'Self-Service',
  },
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(rows);
XLSX.utils.book_append_sheet(wb, ws, 'QA');

const outputPath = path.resolve(__dirname, '../data/bench-buddy.xlsx');
XLSX.writeFile(wb, outputPath);
console.log(`Sample Excel created at: ${outputPath}`);
