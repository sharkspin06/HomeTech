// Rule-based scam checks. Everything runs in the browser: nothing is sent or stored.
// Each check returns { level: "high" | "medium" | "low", findings: [...] }.
// This module is the place to plug in an AI check later (see analyseMessage).
(function () {
  "use strict";

  // ---------- shared data ----------

  // Official domains (and their subdomains) for well-known Singapore organisations.
  var OFFICIAL_DOMAINS = [
    "gov.sg",
    "dbs.com.sg", "dbs.com", "posb.com.sg",
    "ocbc.com", "ocbc.com.sg",
    "uob.com.sg", "uobgroup.com",
    "maybank2u.com.sg", "sc.com", "citibank.com.sg", "hsbc.com.sg",
    "singpost.com",
    "singtel.com", "starhub.com", "m1.com.sg", "simba.sg",
    "grab.com", "shopee.sg", "lazada.sg", "carousell.sg", "carousell.com",
    "whatsapp.com", "google.com", "apple.com", "microsoft.com"
  ];

  // Brand words scammers put into fake web addresses.
  var BRAND_WORDS = [
    "singpass", "gov", "cpf", "iras", "mom", "ica", "mas", "spf", "police", "hdb", "moh",
    "dbs", "posb", "ocbc", "uob", "maybank", "citibank", "hsbc",
    "singpost", "ninjavan", "jnt", "lalamove",
    "singtel", "starhub", "grab", "shopee", "lazada", "carousell", "paynow", "whatsapp"
  ];

  var SHORTENERS = [
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "cutt.ly", "rb.gy",
    "shorturl.at", "tiny.cc", "s.id", "rebrand.ly", "t.ly", "buff.ly"
  ];

  var RISKY_TLDS = [
    "top", "xyz", "icu", "click", "link", "live", "buzz", "shop", "online", "site",
    "club", "vip", "cc", "tk", "ml", "ga", "cf", "gq", "work", "rest", "cyou", "sbs", "cfd", "monster"
  ];

  // ---------- message checker ----------

  // Each rule: patterns (any match), weight, and a plain-language explanation.
  var MESSAGE_RULES = [
    {
      id: "otp",
      weight: 5,
      patterns: [/\b(otp|one[- ]?time (pass(word)?|pin|code)|verification code|tac)\b/i, /\b(singpass|bank)\b.*\b(password|pin)\b/i],
      title: "Asks about an OTP, PIN or password",
      detail: "No real bank, government agency or company will ever ask for your OTP, PIN or password. Never share these."
    },
    {
      id: "safe-account",
      weight: 5,
      patterns: [/safe(ty)? account/i, /(transfer|move) (your )?(money|funds|savings)/i, /assist (in|with) (the )?investigation/i],
      title: "Asks you to move money",
      detail: "Police, MAS and banks will never ask you to transfer money to a 'safe account' or to help an investigation."
    },
    {
      id: "authority",
      weight: 3,
      patterns: [/\b(police|spf|mas|monetary authority|mom|ica|iras|cpf|moh|interpol|customs|court|warrant|arrest|money laundering)\b/i],
      title: "Mentions police, government or legal trouble",
      detail: "Scammers pretend to be officials to frighten you. Real officers don't threaten you by SMS or WhatsApp. Call 1799 to check."
    },
    {
      id: "urgency",
      weight: 2,
      patterns: [/\b(urgent|immediately|act now|within \d+ ?(hours?|hrs?|minutes?|mins?)|today only|final (notice|reminder|warning)|last chance|expires?)\b/i, /(suspend|block|freez|deactivat|terminat|clos)(ed|e|ing)? (your )?(account|card|number|singpass)/i],
      title: "Rushes you to act quickly",
      detail: "Pressure to act fast is the most common scam sign. Real organisations give you time to check."
    },
    {
      id: "payment",
      weight: 3,
      patterns: [/\b(pay(ment)?|fee|deposit|top[- ]?up|transfer|paynow|remit)\b.*(\$|sgd|usd|\d)/i, /(\$|sgd|usd) ?\d+(\.\d{2})?.*\b(pay|fee|deposit|transfer)\b/i, /\bredelivery\b/i],
      title: "Asks you to pay money",
      detail: "Be very careful with any message asking for payment, especially small 'fees' for parcels, prizes or jobs."
    },
    {
      id: "giftcard-crypto",
      weight: 4,
      patterns: [/\b(gift ?cards?|google play cards?|itunes cards?|steam cards?|usdt|bitcoin|btc|crypto(currency)?|binance|wallet address)\b/i],
      title: "Mentions gift cards or cryptocurrency",
      detail: "Scammers ask for gift cards and crypto because the money cannot be traced or returned."
    },
    {
      id: "prize",
      weight: 3,
      patterns: [/\b(congratulations|you('ve| have)? won|winner|lucky draw|prize|reward|claim (your|now)|free gift|cash ?back|voucher)\b/i],
      title: "Says you won a prize or reward",
      detail: "If you didn't join a contest, you cannot win it. 'Claim your prize' messages are a common trick."
    },
    {
      id: "job",
      weight: 5,
      patterns: [/\b(part[- ]?time|work from home|earn|commission|daily (pay|income|salary))\b.*(\$|sgd|per day|daily|\/day)/i, /\b(like|review|rate) (videos|products|hotels|apps)\b/i, /\bsimple tasks?\b/i],
      title: "Offers easy work with high pay",
      detail: "Job offers by SMS or WhatsApp with high pay for simple tasks are almost always scams. Real jobs never ask you to pay."
    },
    {
      id: "investment",
      weight: 3,
      patterns: [/\b(guaranteed|risk[- ]?free|no risk)\b.*\b(return|profit|income)s?\b/i, /\b\d{2,3} ?% (return|profit|daily|weekly|monthly)\b/i, /\b(forex|trading signals?|investment group|vip group)\b/i],
      title: "Promises high or guaranteed profits",
      detail: "No real investment is 'guaranteed' or 'risk-free'. Check any company on the MAS Financial Institutions Directory."
    },
    {
      id: "parcel",
      weight: 2,
      patterns: [/\b(parcel|package|delivery|shipment|courier)\b.*\b(fail|unable|could not|couldn't|pending|held|on hold|incomplete address)\b/i],
      title: "Says there is a problem with a parcel",
      detail: "Fake delivery messages are very common. Check your order directly in the shop's app or on the courier's official website."
    },
    {
      id: "friend",
      weight: 3,
      patterns: [/\b(guess who|new (number|phone)|changed (my )?(number|phone)|this is my new)\b/i],
      title: "Someone claims to be a friend or family member on a new number",
      detail: "Call the person on their old, known number before you do anything, especially before sending money."
    },
    {
      id: "app-install",
      weight: 4,
      patterns: [/\.apk\b/i, /\b(download|install) (this|our|the) app\b/i, /\b(anydesk|teamviewer|rustdesk|remote access)\b/i, /\baccessibility (permission|service|settings)\b/i],
      title: "Asks you to install an app or give remote access",
      detail: "Apps from links or files can steal your banking details and control your phone. Only use the official Play Store or App Store."
    },
    {
      id: "secrecy",
      weight: 3,
      patterns: [/\b(don'?t|do not) (tell|inform|share with) (anyone|anybody|your (family|bank|children))\b/i, /\b(confidential|keep (this )?(a )?secret)\b/i],
      title: "Tells you to keep it secret",
      detail: "Scammers tell you not to talk to family or your bank because they would stop the scam. Always talk to someone you trust."
    },
    {
      id: "personal-info",
      weight: 3,
      patterns: [/\b(nric|ic number|card number|cvv|expiry date|bank (login|details|account number)|update your (details|information|particulars))\b/i],
      title: "Asks for personal or bank details",
      detail: "Never give your NRIC, card number, CVV or banking login through a message or link."
    }
  ];

  var URL_IN_TEXT = /\b((https?:\/\/|www\.)[^\s<>"']+|[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|sg|net|org|info|top|xyz|icu|click|link|live|buzz|shop|online|site|club|vip|cc|ly|me|io|co)(\/[^\s<>"']*)?)/gi;
  var FOREIGN_PHONE = /(\+|00)(?!65)\d{1,3}[\s-]?\d{3,}/;
  var CODE_LIKE = /\b\d{6}\b/;

  function analyseMessage(text) {
    var findings = [];
    var score = 0;

    MESSAGE_RULES.forEach(function (rule) {
      var hit = rule.patterns.some(function (p) { return p.test(text); });
      if (hit) {
        score += rule.weight;
        findings.push({ severity: rule.weight >= 4 ? "high" : "medium", title: rule.title, detail: rule.detail });
      }
    });

    var links = (text.match(URL_IN_TEXT) || []).filter(function (u) { return u.indexOf(".") > 0; });
    var riskyLinks = [];
    links.forEach(function (raw) {
      var res = analyseLink(raw);
      if (res.ok && res.level !== "low") riskyLinks.push(res.host);
    });

    if (riskyLinks.length) {
      score += 4;
      findings.push({
        severity: "high",
        title: "Contains a suspicious link",
        detail: "The link (" + riskyLinks.slice(0, 2).join(", ") + ") shows warning signs. Do not click it. Check it in the link checker below for details."
      });
    } else if (links.length) {
      score += 1;
      findings.push({
        severity: "medium",
        title: "Contains a link",
        detail: "Even links that look normal can be fake. It is safer to open the official app or type the website address yourself."
      });
    }

    if (FOREIGN_PHONE.test(text)) {
      score += 1;
      findings.push({
        severity: "medium",
        title: "Has an overseas phone number",
        detail: "Singapore numbers start with +65. Calls and messages from overseas numbers claiming to be local organisations are suspicious."
      });
    }

    var level = score >= 6 ? "high" : score >= 3 ? "medium" : "low";

    return {
      level: level,
      findings: findings,
      containsCode: CODE_LIKE.test(text)
    };
  }

  // ---------- link checker ----------

  function registrableHost(host, official) {
    return host === official || host.slice(-(official.length + 1)) === "." + official;
  }

  function analyseLink(raw) {
    var input = String(raw || "").trim();
    if (!input) return { ok: false, error: "Please paste a link first." };

    var withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : "http://" + input;
    var url;
    try {
      url = new URL(withScheme);
    } catch (e) {
      return { ok: false, error: "This doesn't look like a web link. Check that you copied the whole link." };
    }

    var host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (!host || host.indexOf(".") === -1) {
      return { ok: false, error: "This doesn't look like a web link. Check that you copied the whole link." };
    }

    var findings = [];
    var score = 0;
    function add(weight, title, detail) {
      score += weight;
      findings.push({ severity: weight >= 4 ? "high" : weight >= 2 ? "medium" : "info", title: title, detail: detail });
    }

    var official = OFFICIAL_DOMAINS.filter(function (d) { return registrableHost(host, d); })[0];
    var labels = host.split(".");
    var tld = labels[labels.length - 1];
    var isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.indexOf(":") !== -1;

    if (url.protocol !== "https:" && /^[a-z]+:\/\//i.test(input)) {
      add(2, "Not a secure (https) link", "Real banks and government sites use https. A link starting with http:// is a warning sign.");
    }
    if (url.username || url.password || /@/.test(input.replace(/^[a-z]+:\/\//i, "").split("/")[0])) {
      add(5, "Hides the real address with an @ sign", "Everything before the @ is ignored. Scammers use this trick to make a fake link look real.");
    }
    if (isIp) {
      add(4, "Uses numbers instead of a name", "Real websites use names like dbs.com.sg, not number addresses like 103.21.44.8.");
    }
    if (host.indexOf("xn--") !== -1) {
      add(4, "Uses look-alike letters", "This address uses special characters that can look like normal letters, to copy a real website.");
    }
    if (SHORTENERS.indexOf(host) !== -1) {
      add(3, "Shortened link", "Short links hide where they really go. Banks and government agencies don't send these by SMS.");
    }
    if (RISKY_TLDS.indexOf(tld) !== -1) {
      add(3, "Unusual website ending (." + tld + ")", "Website endings like ." + tld + " are cheap and often used for scam sites.");
    }

    if (!official) {
      var flat = host.replace(/[0-9]/g, function (d) { return { "0": "o", "1": "l", "3": "e", "5": "s" }[d] || d; });
      var brand = BRAND_WORDS.filter(function (b) {
        // Short names (mas, ica, mom...) need a word edge on the left, or "americaonline" would match "ica".
        var left = b.length <= 3 ? "(^|[.-])" : "";
        return new RegExp("(^|[.-])" + b + "([.-]|$)|" + left + b + "(sg|login|secure|verify|update|support|help|service|online)", "i").test(flat);
      })[0];
      if (brand) {
        add(5, "Pretends to be " + (brand === "gov" ? "a government agency" : brand.toUpperCase()), "The address contains '" + brand + "' but is not that organisation's real website. This is a very common trick.");
      }
      if (/(^|\.)gov\.sg\./.test(host) || /gov-sg|govsg/.test(host)) {
        add(5, "Fake government address", "Real Singapore government websites END with .gov.sg. This one only contains it.");
      }
    }

    if (/(login|log-in|signin|verify|verification|secure|update|unlock|suspend|confirm|account|wallet|claim|reward|refund)/i.test(host)) {
      add(2, "Uses alarm or login words in the address", "Words like 'verify', 'secure' or 'login' in the website name are often used by fake sites.");
    }
    if ((host.match(/-/g) || []).length >= 3) {
      add(1, "Many dashes in the address", "Long addresses with many dashes are a common sign of a fake site.");
    }
    if (labels.length >= 5 && !official) {
      add(2, "Very long address", "Scam addresses often stack many words together so the real ending is hard to see.");
    }
    if (/\.(apk|exe|scr|bat|msi)(\?|$)/i.test(url.pathname)) {
      add(5, "Downloads an app file", "This link downloads a program. Installing apps from links can let scammers control your phone.");
    }

    var level;
    if (official && score < 4) {
      level = "low";
      findings.unshift({
        severity: "good",
        title: "Official address: " + official,
        detail: "This link goes to " + host + ", which belongs to the official " + official + " website. Still, only enter details if you opened the link yourself, not from a message you didn't expect."
      });
    } else {
      level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
    }

    return { ok: true, level: level, host: host, findings: findings, official: official || null };
  }

  window.HomeTechCheckers = {
    analyseMessage: analyseMessage,
    analyseLink: analyseLink
  };
})();
