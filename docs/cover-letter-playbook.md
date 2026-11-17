# Cover letter playbook

How Briefcase writes cover letters, and the research behind each choice. The code lives in
`backend/common/cover_letters.py`; the builder UI in `frontend/src/components/cover-letter/`.

## What the research says

Most published cover-letter numbers come from resume-tool vendors with undisclosed methods, so
treat exact percentages loosely. The *direction* of the findings is consistent across sources:

| Finding | Evidence | Constraint it becomes |
| --- | --- | --- |
| Tailoring is the signal. A generic letter performs about like no letter. | Jobscan (~1M searches): letters with resumes ~1.9x more interviews. ResumeGo field study: tailored letters lift callbacks, generic ones barely move them. Freelancer.com data (Cui, Dias & Ye, 2025): letter-to-posting similarity predicted hiring before AI tools. | Every template ties each claim to a requirement in the posting, names the company and role, and mirrors the posting's keywords where the experience backs them. |
| Restating the resume is the most common mistake. | Alison Green (Ask a Manager): "the No. 1 rule... you can't just summarize your résumé." | The letter adds what the resume can't: context behind results, how the candidate works, why this role. |
| Show, don't assert. Specific and quantified beats adjectives. | Recruiter surveys (CareerBuilder, Resume Genius) consistently favor quantified achievements. Green: don't claim "great communicator" without evidence. | Every strength needs an example from the experience bank, with a number when the bank has one. Unbacked self-descriptions are banned. |
| Look forward. | Amy Gallo (HBR Guide): the resume covers the past; the letter is "about the future." Show you understand the company's challenges. | Close beats are forward-looking. The *Problem solver* template is built around the team's challenge. |
| Half a page to one page. | ResumeGo/Zety/MyPerfectResume surveys: about half of hiring managers prefer ~half a page; 250–400 words is the consensus; almost nobody wants more than a page. ~25% prefer just a few sentences. | Lengths: Brief 120–180, Standard 250–350 (default), Detailed 400–500 words. Never over one page. *Quick note* covers the "few sentences" crowd. |
| Skip the stock opener. Hook, then connect. | Muse, Zety, Career Contessa: replace "I am writing to apply" with an achievement, connection, or insight; the second sentence ties it to the employer's need. | Each template defines its opening beat. Stock openers are banned in the prompt and flagged in the letter check. |
| Generic AI text is penalized; AI use per se less so. | TopResume 2026 (800+ managers): 67% say they can spot AI letters, 54% view them negatively. Resume Now 2025: 53% frustrated by templated messages. "Anti-generic, not anti-AI." | A banned-phrase list (shared by prompt and UI), no em dashes, varied sentence starts, no summarizing flourishes. |
| Once AI made tailoring cheap, tailoring stopped signalling; the candidate's own effort still does. | Cui, Dias & Ye (2025): after Freelancer's AI writer launched, the tailoring–callback link fell ~52%. 75%+ of AI letters were sent within a minute; more editing time correlated with more callbacks and offers. | The builder asks for the candidate's own words (why this company, a story to feature, a referral). The prompt must build on them. The letter check nudges until the candidate has edited the draft. |
| Address a person when you can. | Gallo: a named person beats "To whom it may concern." | Optional "Addressed to" field; otherwise "Dear {Company} Hiring Team." Titles are never guessed (no Mr./Ms.). |
| Format choice depends on the role. | T-format letters suit structured roles with explicit must-haves (IT, finance, government). Pain letters (Liz Ryan) suit roles hired to fix a known problem but read as presumptuous if overdone. Career-change guides: name the pivot up front and translate the skills; never apologize. | One template per pattern, each with "best for" guidance and guard-rail rules. |

## Option dimensions

- **Template** (structure and scope): the ordered *beats* of the letter and template-specific rules.
  `proof_first` (default), `problem_solver`, `story`, `requirements_match`, `career_change`,
  `early_career`, `warm_intro` (requires a referral), `leadership`, `quick_note` (brief only).
  The backend recommends `early_career` or `leadership` from the job title.
- **Tone**: `professional`, `conversational`, `direct`, `enthusiastic`, `formal`. Each sets voice
  rules, greeting, and closing.
- **Length** (depth): `brief`, `standard`, `detailed`, each with a word range and paragraph count.
- **Emphasis** (up to two): `impact`, `technical`, `leadership`, `collaboration`, `mission`, `growth`.
- **The candidate's own input**: recipient, why this company, story to feature, referral, context
  to address (relocation, gap), extra instructions, and whether to mirror posting keywords.

## Hard rules in every prompt

1. Only experience from the candidate's bank. No invented employers, metrics, tools, stories, or dialogue.
2. Only company facts from the posting or the candidate's notes.
3. The candidate's notes are used as given, not swapped for invented motivation.

## Sources

- Jobscan, ResumeGo, and survey roundups: [coverlettercopilot.ai](https://coverlettercopilot.ai/blog/how-important-is-a-cover-letter), [resume.io statistics](https://resume.io/blog/cover-letter-statistics), [Zety recruiter survey](https://zety.com/blog/recruiting-preferences), [MyPerfectResume trends](https://www.myperfectresume.com/career-center/careers/basics/cover-letter-trends)
- Cui, Dias & Ye, [Signaling in the Age of AI: Evidence from Cover Letters](https://arxiv.org/html/2509.25054) (2025); Wharton, [AI Is Killing the Cover Letter](https://knowledge.wharton.upenn.edu/opinion/ai-is-killing-the-cover-letter/)
- Alison Green: [CNBC interview](https://www.cnbc.com/2020/08/13/how-to-write-a-cover-letter-actually-get-noticed.html), [Ask a Manager](https://askamanager.org/2018/11/you-need-to-write-a-better-cover-letter.html)
- Amy Gallo, HBR: [podcast transcript](https://podcastrex.com/shows/harvard-business-review/how-to-write-a-cover-letter-that-sounds-like-you-and-catches-eyes/transcript), [HBR Guide chapter](https://www.oreilly.com/library/view/hbr-guide-to/9781647825942/html/17_8__How_to_Write_a_Cover_Letter.xhtml)
- Openers: [The Muse](https://www.themuse.com/advice/31-attentiongrabbing-cover-letter-examples), [Zety](https://zety.com/blog/how-to-start-a-cover-letter)
- Formats: [T-format (Ladders)](https://medium.com/laddershq/perfecting-your-cover-letter-to-a-t-f6becf1a109), [BioSpace](https://www.biospace.com/special-cover-letter-formats-can-grab-employers-attention), [Pain letter (The Muse)](https://www.themuse.com/advice/the-pain-letter-the-best-way-to-write-a-cover-letter-that-gets-results), [Career change (The Muse)](https://www.themuse.com/advice/career-change-cover-letter)
- AI perception: [TopResume survey](https://topresume.com/career-advice/ai-in-hiring-survey), [Resume Now report](https://www.resume-now.com/job-resources/careers/ai-applicant-report)
