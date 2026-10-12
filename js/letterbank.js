/* ApplyPilot AI — cover-letter data bank: tone templates + sentence banks.
   Templates use {name} {role} {company} {body} {closing} placeholders. */
"use strict";

const TONES = {
  professional: {
    label: "Professional",
    openers: [
      "I am writing to apply for the {role} position at {company}.",
      "Please accept my application for the {role} role at {company}.",
      "I was excited to see the opening for {role} at {company}."
    ],
    closers: [
      "Thank you for your consideration. I would welcome the opportunity to discuss how I can contribute to {company}.",
      "I appreciate your time and look forward to the possibility of speaking with you.",
      "Thank you for reviewing my application. I am eager to bring my experience to {company}."
    ]
  },
  warm: {
    label: "Warm & personable",
    openers: [
      "When I saw the {role} opening at {company}, it felt like a role written for me.",
      "I'm genuinely excited to apply for the {role} position at {company}.",
      "{company}'s work caught my eye a while ago — I'd love to contribute as your next {role}."
    ],
    closers: [
      "I'd love to chat about how I could help {company} — thanks so much for considering me!",
      "Thanks for reading — I hope we get the chance to talk soon.",
      "I'm excited about the possibility of joining {company} and would love to tell you more."
    ]
  },
  bold: {
    label: "Bold & confident",
    openers: [
      "I don't just want the {role} job at {company} — I'm ready to excel at it from day one.",
      "{company} needs a {role} who delivers. That's exactly what I do.",
      "Let me be direct: I'm the {role} candidate {company} has been looking for."
    ],
    closers: [
      "Give me 15 minutes and I'll show you the impact I can make at {company}.",
      "I'm ready to start delivering results — let's talk.",
      "The best next step is a conversation. I'm confident it will be worth your time."
    ]
  }
};

/* Value-prop sentence frames. {kw} = matched keyword, {bg} = background snippet. */
const VALUE_PROPS = [
  "In my recent work, {bg}, which maps directly to your need for {kw}.",
  "My background in {bg} has prepared me well for the {kw} challenges this role involves.",
  "I've spent my career building strength in {kw} — most recently, {bg}.",
  "What sets me apart is hands-on experience with {kw}: {bg}."
];

/* Common skill keywords to extract from job descriptions. */
const SKILL_KEYWORDS = [
  "javascript", "typescript", "python", "java", "react", "node", "sql",
  "leadership", "management", "mentoring", "communication", "sales",
  "marketing", "design", "analysis", "data", "excel", "project management",
  "customer service", "support", "testing", "qa", "devops", "cloud", "aws",
  "azure", "accounting", "bookkeeping", "payroll", "nursing", "teaching",
  "writing", "editing", "seo", "social media", "logistics", "scheduling",
  "budgeting", "forecasting", "negotiation", "recruiting", "onboarding",
  "training", "coaching", "strategy", "planning", "research"
];

/* Post-interview thank-you note banks. Placeholders: {interviewer} {role} {company}. */
const THANKYOU = {
  openers: {
    professional: [
      "Thank you for speaking with me today about the {role} position at {company}.",
      "I appreciate you taking the time to discuss the {role} role at {company} with me.",
      "It was a pleasure speaking with you about the {role} opportunity at {company}."
    ],
    warm: [
      "Thank you so much for the lovely conversation today about the {role} role at {company}!",
      "I really enjoyed chatting with you about the {role} position at {company} — thank you for your time.",
      "What a great conversation — thank you for telling me more about the {role} role at {company}."
    ],
    bold: [
      "Thanks for your time today — our talk about the {role} role at {company} confirmed this is the right move.",
      "I appreciated the direct conversation about the {role} position at {company}.",
      "Thank you for the interview — I'm more convinced than ever I'm the right {role} for {company}."
    ]
  },
  bodies: [
    "Hearing about the team's priorities helped me picture exactly how I'd contribute from day one.",
    "Our discussion about where the team is headed made me even more excited about the role.",
    "I left our conversation energized — the challenges you described are exactly the kind of work I do best."
  ],
  closers: {
    professional: [
      "Please don't hesitate to reach out if you need anything else from me. I look forward to next steps.",
      "Thank you again for your consideration — I'm enthusiastic about the possibility of joining {company}.",
      "I'm happy to provide references or work samples whenever helpful. Thanks again for your time."
    ],
    warm: [
      "Thanks again for such a thoughtful conversation — I hope we get to work together!",
      "I'm excited about the possibility of joining the team. Thanks again for your time!",
      "Please let me know if there's anything else I can share. Hope to talk again soon!"
    ],
    bold: [
      "I'm ready to deliver results for {company} — let's keep this moving.",
      "Next step is yours, but I'm confident I'd be an asset to the team. Thanks for your time.",
      "Let's not let this one sit — I'm the hire you're looking for. Thanks again."
    ]
  }
};
const STAGES = ["wishlist", "applied", "interviewing", "offer", "rejected"];
const STAGE_LABELS = {
  wishlist: "Wishlist",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected"
};

const FOLLOWUP_AFTER_DAYS = 7;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TONES, VALUE_PROPS, SKILL_KEYWORDS, THANKYOU, STAGES, STAGE_LABELS, FOLLOWUP_AFTER_DAYS };
}
