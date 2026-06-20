import React from 'react';
import {
  BookOpen,
  Bug,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Lock,
  Mail,
  MonitorSmartphone,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wrench
} from 'lucide-react';

interface HelpCenterViewProps {
  searchText: string;
}

interface HelpTopic {
  question: string;
  answer: React.ReactNode;
}

interface HelpSection {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  topics: HelpTopic[];
}

const bullet = (items: string[]) => (
  <ul className="mt-3 grid gap-2 text-xs text-zinc-300">
    {items.map((item) => (
      <li key={item} className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const helpSections: HelpSection[] = [
  {
    title: 'Getting Started',
    description: 'Understand TestPilot AI and launch your first automated test session.',
    icon: PlayCircle,
    topics: [
      {
        question: 'What is TestPilot AI?',
        answer: (
          <>
            <p>TestPilot AI is an automated QA platform that uses AI agents to interact with your web application like a real user.</p>
            {bullet([
              'Test user flows',
              'Detect UI issues',
              'Validate functionality',
              'Generate bug reports',
              'Capture screenshots',
              'Create testing documentation'
            ])}
          </>
        )
      },
      {
        question: 'How do I start a test?',
        answer: (
          <>
            <ol className="mt-2 grid gap-2 text-xs text-zinc-300">
              {[
                'Navigate to the Dashboard.',
                'Click New Test Session.',
                'Enter your application URL.',
                'Describe what you want the AI to test.',
                'Click Start Testing.'
              ].map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-500/15 text-[10px] font-bold text-indigo-300">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3">The AI agent will automatically navigate through your application and generate results.</p>
          </>
        )
      },
      {
        question: 'Can I test local applications?',
        answer: (
          <>
            <p>Yes. If your application is running locally, you can use localhost URLs, local network IP addresses, or the testing tunnel feature.</p>
            <div className="mt-3 grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] text-indigo-200">
              <span>http://localhost:3000</span>
              <span>http://127.0.0.1:5173</span>
              <span>http://192.168.1.20:3000</span>
            </div>
          </>
        )
      }
    ]
  },
  {
    title: 'Authentication & Login',
    description: 'Help the AI authenticate and understand login failures.',
    icon: UserCheck,
    topics: [
      {
        question: 'Can the AI log in to my application?',
        answer: (
          <>
            <p>Yes. When creating a test session, you can provide the credentials and instructions needed for authentication.</p>
            {bullet(['Username', 'Email', 'Password', 'Authentication instructions'])}
          </>
        )
      },
      {
        question: 'What if login fails?',
        answer: (
          <>
            <p>If login fails, the AI records what happened and continues testing accessible pages when possible.</p>
            {bullet(['Capture screenshots', 'Record error messages', 'Log failed authentication attempts', 'Include the failure in the final report'])}
          </>
        )
      },
      {
        question: 'Does TestPilot AI store my credentials?',
        answer: <p>No. Credentials are encrypted during testing and are never stored permanently after the test session is completed.</p>
      }
    ]
  },
  {
    title: 'Test Reports',
    description: 'Review output, download reports, and understand issue severity.',
    icon: FileText,
    topics: [
      {
        question: 'What information is included in a report?',
        answer: bullet(['Test summary', 'Pages visited', 'Actions performed', 'Screenshots', 'Detected issues', 'Severity levels', 'Reproduction steps', 'Recommendations'])
      },
      {
        question: 'Can I download reports?',
        answer: (
          <>
            <p>Yes. Reports can be exported in several formats.</p>
            {bullet(['PDF', 'JSON', 'CSV', 'Markdown'])}
          </>
        )
      },
      {
        question: 'How are bugs categorized?',
        answer: (
          <div className="mt-2 grid gap-2 text-xs">
            {[
              ['Critical', 'Application crashes or major functionality failures.', 'text-rose-300'],
              ['High', 'Important features are broken.', 'text-orange-300'],
              ['Medium', 'Partial functionality issues or workflow interruptions.', 'text-amber-300'],
              ['Low', 'Minor UI, content, or usability issues.', 'text-sky-300']
            ].map(([label, copy, color]) => (
              <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <span className={`font-bold ${color}`}>{label}</span>
                <p className="mt-1 text-zinc-400">{copy}</p>
              </div>
            ))}
          </div>
        )
      }
    ]
  },
  {
    title: 'AI Testing Features',
    description: 'Explore supported workflows, devices, and generated test artifacts.',
    icon: Sparkles,
    topics: [
      {
        question: 'What can the AI test?',
        answer: bullet(['Login flows', 'Registration forms', 'Navigation menus', 'Checkout processes', 'User dashboards', 'Search functionality', 'Settings pages', 'Form submissions', 'Multi-step workflows'])
      },
      {
        question: 'Can the AI test mobile responsiveness?',
        answer: (
          <>
            <p>Yes. You can select different device profiles and the AI will simulate the selected viewport.</p>
            {bullet(['Desktop', 'Tablet', 'Mobile'])}
          </>
        )
      },
      {
        question: 'Can the AI generate test cases?',
        answer: (
          <>
            <p>Yes. The platform can automatically generate functional and journey-based testing assets.</p>
            {bullet(['Functional test cases', 'Regression test cases', 'User journey tests', 'Edge case scenarios'])}
          </>
        )
      }
    ]
  },
  {
    title: 'Troubleshooting',
    description: 'Fix stuck sessions, missing elements, MFA friction, and stopped runs.',
    icon: Wrench,
    topics: [
      {
        question: 'My test is stuck',
        answer: (
          <>
            <p>Try the following steps first. If the issue persists, contact support.</p>
            {bullet(['Refresh the page.', 'Verify your application URL.', 'Ensure your application is accessible.', 'Restart the test session.'])}
          </>
        )
      },
      {
        question: 'The AI cannot find a button',
        answer: (
          <>
            <p>This can happen when the element loads dynamically, is hidden, or the page has accessibility issues. Try providing more detailed testing instructions.</p>
          </>
        )
      },
      {
        question: 'My application uses MFA',
        answer: (
          <>
            <p>Currently, some MFA methods require manual verification.</p>
            {bullet(['Email OTP', 'SMS OTP', 'Authenticator apps coming soon'])}
          </>
        )
      },
      {
        question: 'Why did the AI stop testing?',
        answer: (
          <>
            <p>Common reasons include authentication failure, network timeout, application crash, permission restrictions, or session expiration. The exact reason will be shown in the test logs.</p>
          </>
        )
      }
    ]
  },
  {
    title: 'Security & Privacy',
    description: 'How testing data and application information are protected.',
    icon: ShieldCheck,
    topics: [
      {
        question: 'Is my data secure?',
        answer: (
          <>
            <p>Yes. TestPilot AI uses secure handling throughout test execution.</p>
            {bullet(['Encrypted connections', 'Secure session isolation', 'Temporary test environments', 'Automatic data cleanup'])}
          </>
        )
      },
      {
        question: 'Do you store application data?',
        answer: <p>No. Application data is processed only during testing and is deleted after the session ends.</p>
      }
    ]
  },
  {
    title: 'Contact Support',
    description: 'Reach the team, browse docs, or report product issues.',
    icon: Mail,
    topics: [
      {
        question: 'Need additional help?',
        answer: (
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <a href="mailto:support@testpilot.ai" className="rounded-lg border border-indigo-500/25 bg-indigo-500/10 p-4 text-indigo-200 transition-colors hover:bg-indigo-500/15">
              <Mail className="mb-3 h-5 w-5" />
              <span className="block text-xs font-bold">Email Support</span>
              <span className="mt-1 block text-[11px] text-indigo-300">support@testpilot.ai</span>
            </a>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <BookOpen className="mb-3 h-5 w-5 text-emerald-300" />
              <span className="block text-xs font-bold text-zinc-200">Documentation</span>
              <span className="mt-1 block text-[11px] text-zinc-400">Browse detailed setup guides and tutorials.</span>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <Bug className="mb-3 h-5 w-5 text-rose-300" />
              <span className="block text-xs font-bold text-zinc-200">Report a Bug</span>
              <span className="mt-1 block text-[11px] text-zinc-400">Submit a support ticket from your dashboard.</span>
            </div>
          </div>
        )
      }
    ]
  }
];

export default function HelpCenterView({ searchText }: HelpCenterViewProps) {
  const normalizedSearch = searchText.trim().toLowerCase();
  const filteredSections = normalizedSearch
    ? helpSections
        .map((section) => ({
          ...section,
          topics: section.topics.filter((topic) =>
            `${section.title} ${section.description} ${topic.question}`.toLowerCase().includes(normalizedSearch)
          )
        }))
        .filter((section) => section.topics.length > 0)
    : helpSections;

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950/40 p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-300">
                <HelpCircle className="h-4 w-4" />
                Help Center
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">Welcome to TestPilot AI</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                TestPilot AI helps developers automatically test web applications using AI-powered agents. Provide your application URL, define your testing goals, and let the AI explore your app, identify issues, and generate detailed reports.
              </p>
            </div>
            <div className="grid min-w-[280px] grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
                <MonitorSmartphone className="mb-3 h-5 w-5 text-sky-300" />
                <span className="block font-bold text-zinc-200">Device Profiles</span>
                <span className="mt-1 block text-zinc-500">Desktop, tablet, mobile</span>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
                <Lock className="mb-3 h-5 w-5 text-emerald-300" />
                <span className="block font-bold text-zinc-200">Private Testing</span>
                <span className="mt-1 block text-zinc-500">Encrypted and temporary</span>
              </div>
            </div>
          </div>
        </section>

        {filteredSections.length === 0 ? (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-8 text-center">
            <Search className="mx-auto h-8 w-8 text-zinc-500" />
            <h2 className="mt-3 text-sm font-bold text-zinc-200">No help topics found</h2>
            <p className="mt-1 text-xs text-zinc-500">Try a different search term in the global search field.</p>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {filteredSections.map((section) => {
              const Icon = section.icon;
              return (
                <section key={section.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/45 p-5">
                  <div className="mb-5 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-zinc-100">{section.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">{section.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {section.topics.map((topic) => (
                      <article key={topic.question} className="rounded-lg border border-zinc-800/80 bg-zinc-950/55 p-4">
                        <h3 className="text-xs font-bold text-zinc-100">{topic.question}</h3>
                        <div className="mt-2 text-xs leading-5 text-zinc-400">{topic.answer}</div>
                      </article>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <section className="flex flex-col gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-indigo-100">Need additional help?</h2>
            <p className="mt-1 text-xs text-indigo-200/80">Email Support at support@testpilot.ai or submit a support ticket from your dashboard.</p>
          </div>
          <a href="mailto:support@testpilot.ai" className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-indigo-400">
            <Download className="h-4 w-4" />
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
}
