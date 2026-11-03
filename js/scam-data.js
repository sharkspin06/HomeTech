// Scam types shown in the "Common scams in Singapore" section.
// Kept as plain data so it can be translated (中文 / Melayu / தமிழ்) or
// refreshed from official sources later without touching the page code.
window.SCAM_TYPES = [
  {
    id: "impersonation",
    icon: "👮",
    title: "Fake officials",
    summary: "Someone pretends to be from the police, MAS, MOM, ICA, CPF, IRAS or a bank.",
    signs: [
      "Says you are involved in a crime, or your account has a problem",
      "Transfers your call to another 'officer'",
      "Asks you to move money to a 'safe account' or give your banking details"
    ],
    action: "Hang up. Government officers will never ask you to transfer money, give bank login details, or install apps over the phone. Call 1799 to check."
  },
  {
    id: "phishing",
    icon: "🎣",
    title: "Fake links (phishing)",
    summary: "SMS or email with a link to a fake bank, SingPost, or government website.",
    signs: [
      "Message has a link and says 'act now' or 'account suspended'",
      "Website asks for your card number, OTP or Singpass",
      "Website address looks almost right but has extra words or odd endings"
    ],
    action: "Don't click. Open your bank app or type the official website yourself. Singapore government websites end with .gov.sg."
  },
  {
    id: "job",
    icon: "💼",
    title: "Job scams",
    summary: "Easy job offers: like videos, review products or 'complete tasks' for high pay.",
    signs: [
      "Pay is very high for very easy work",
      "You receive small payments first to gain your trust",
      "You must pay or 'top up' to unlock bigger tasks"
    ],
    action: "Real jobs never ask you to pay money to work. Stop and do not transfer more."
  },
  {
    id: "investment",
    icon: "📈",
    title: "Investment scams",
    summary: "Promises of guaranteed high returns, often crypto, gold or forex.",
    signs: [
      "'Guaranteed' profit or 'no risk'",
      "Added to a chat group full of people celebrating profits",
      "Asked to download an unknown trading app"
    ],
    action: "Check the company on the MAS Financial Institutions Directory. If returns sound too good to be true, they are."
  },
  {
    id: "ecommerce",
    icon: "🛒",
    title: "Online shopping scams",
    summary: "Fake sellers on Carousell, Facebook or Telegram selling items that never arrive.",
    signs: [
      "Price is much lower than elsewhere",
      "Seller asks you to pay outside the platform or by bank transfer only",
      "Seller rushes you: 'many people want this'"
    ],
    action: "Use the platform's protected payment, or meet in person to pay on collection."
  },
  {
    id: "friend",
    icon: "💬",
    title: "Fake friend calls",
    summary: "'Hi, guess who?' A caller or texter pretends to be someone you know, then asks for a loan.",
    signs: [
      "New number, says they 'changed phone'",
      "Asks you to guess their name",
      "Soon asks to borrow money urgently"
    ],
    action: "Call your friend or relative on their old number to check before sending anything."
  },
  {
    id: "malware",
    icon: "📱",
    title: "Malware apps",
    summary: "You are told to download an app (APK) to buy food, cleaning services or claim a reward.",
    signs: [
      "App is sent as a file or link, not from the Play Store / App Store",
      "App asks for 'Accessibility' permission",
      "Phone becomes slow or acts by itself"
    ],
    action: "Only install apps from official app stores. If you installed one, turn on flight mode, call your bank, and get help resetting your phone."
  },
  {
    id: "love",
    icon: "💔",
    title: "Love scams",
    summary: "An online 'partner' builds trust over weeks, then needs money for an emergency.",
    signs: [
      "Never able to video call or meet",
      "Works overseas: soldier, engineer, doctor",
      "Asks for money for customs, medical bills or flights"
    ],
    action: "Never send money to someone you have not met in person. Talk to a family member you trust."
  }
];
