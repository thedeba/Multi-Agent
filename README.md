# Multi Agent

**আলাদা browser profile, proxy configuration এবং ব্যবহারিক privacy control—একটি desktop app-এ।**

Multi Agent এমন একটি desktop application, যার সাহায্যে কাজ, account বা
প্রয়োজন অনুযায়ী একাধিক browser profile আলাদাভাবে সাজিয়ে ব্যবহার করা যায়।
প্রতিটি profile-এর browser data আলাদা থাকে, তাই এক profile-এর cookies, sign-in
এবং browsing session অন্য profile-এর সঙ্গে মিশে যায় না। প্রয়োজনের সময় profile
চালু করুন, কাজ শেষে বন্ধ করুন।

## অ্যাপটি কী কাজে লাগে

- **আলাদা browser profile:** বিভিন্ন কাজ বা account-এর জন্য profile তৈরি,
  সম্পাদনা, duplicate, import ও organize করুন।
- **Profile অনুযায়ী browser চালানো:** profile-এর নিজস্ব data directory-তে
  Chrome, Microsoft Edge বা Brave চালু করুন। Browser app-টি আলাদাভাবে install
  থাকতে হবে।
- **Proxy configuration:** profile-এর জন্য proxy নির্ধারণ, connection পরীক্ষা
  এবং reusable proxy configuration সংরক্ষণ করুন।
- **Privacy preset:** Standard, Balanced বা Strict preset বেছে নিন। এগুলো
  পরিচিত tracker ও third-party cookie সীমিত করা, WebRTC control এবং নির্বাচিত
  fingerprinting-related mitigation-এর মতো সুবিধা configure করে।
- **Browser পরিচিতি সেটিং:** browser version নির্বাচন বা custom User-Agent
  দেওয়া যায়। User-Agent বদলালে website-এ browser পরিচিতি বদলায়; browser
  software-এর version upgrade হয় না।
- **Account-ভিত্তিক profile sync:** administrator-এর দেওয়া account দিয়ে sign
  in করলে সেই account-এর profile settings cloud-এ sync করা যায়। এক account-এর
  profile অন্য account-এ দেখানো হয় না।

## Privacy সম্পর্কে গুরুত্বপূর্ণ কথা

Multi Agent-এর privacy protection **best-effort**—সব tracker বা
fingerprinting পদ্ধতি আটকানোর নিশ্চয়তা দেয় না এবং anonymity নিশ্চিত করে না।
ওয়েবসাইট, browser version, network, extension ও ব্যবহারকারীর পছন্দের ওপর
বাস্তব সুরক্ষা নির্ভর করে। সংবেদনশীল কাজের ক্ষেত্রে নিজের ঝুঁকি ও প্রয়োজন
বুঝে ব্যবহার করুন।

Cloud sync-এ profile settings Firestore-এ এবং browser profile-এর encrypted
snapshot Firebase Storage-এ রাখা যায়। Browser বন্ধ হওয়ার পরে snapshot তৈরি
হয়; অন্য computer-এ একই account-এ sign in করে একই sync passphrase লিখে **Sync
now** চাপলে নতুন profile-এর session restore হয়। Site-এর security policy,
device বা network বদলের কারণে কোনো website আবার sign-in চাইতে পারে।

Snapshot এবং proxy username/password client-side AES-GCM দিয়ে encrypt হয়।
Sync passphrase app-এ বা Firebase-এ সংরক্ষণ করা হয় না; সব computer-এ একই
passphrase ব্যবহার করুন এবং নিরাপদ জায়গায় লিখে রাখুন। Passphrase হারালে
encrypted cloud data উদ্ধার করা যাবে না। Sync করা browser data-তে cookies,
site storage, session state, browsing history ও profile-এর অন্যান্য local
files থাকতে পারে। Chromium-এর OS-bound saved-password vault, cookie database
এবং OS encryption key snapshot থেকে বাদ থাকে; saved password অন্য computer-এ
স্থানান্তরিত হবে না। Cache ও অন্যান্য website data snapshot-এ থাকতে পারে।

এই সুবিধার জন্য Firebase project-এ **Cloud Storage** চালু করে bucket তৈরি
করতে হবে; `.env.local`-এ `VITE_FIREBASE_STORAGE_BUCKET`-এ bucket-এর নাম দিয়ে
app rebuild করুন এবং Firebase Security Rules deploy করুন। Profile snapshot
সর্বোচ্চ 2 GB; Cloud Storage usage ও transfer-এর জন্য Firebase/Google Cloud
charge হতে পারে। App-এ নিজে থেকে account তৈরি করা যায় না; login account
administrator আগে থেকেই তৈরি করে দেবেন।

## Release ডাউনলোড ও ইনস্টল

প্রকাশিত build পেতে [GitHub Releases](https://github.com/thedeba/Privacy-Browser/releases)
পাতায় যান। Release প্রকাশিত হলে পছন্দের version খুলে **Assets** থেকে আপনার
operating system ও processor-এর সঙ্গে মেলে এমন ফাইলটি download করুন।

### macOS

1. Apple Silicon Mac (M-series) হলে `-arm64.dmg` ফাইলটি নিন। Intel Mac হলে
   `-arm64` ছাড়া `.dmg` ফাইলটি নিন।
2. Download করা `.dmg` খুলুন।
3. Multi Agent app-টি **Applications** folder-এ drag করুন।
4. Applications থেকে Multi Agent চালু করুন। macOS security confirmation
   দেখালে app-টি official GitHub Releases page থেকেই download করেছেন কি না
   যাচাই করে তারপর অনুমতি দিন।

### Windows

1. Intel/AMD 64-bit Windows-এর জন্য `-win.zip`, আর Windows ARM device-এর জন্য
   `-arm64-win.zip` ফাইলটি নিন।
2. ZIP file-টি extract করুন।
3. Extract করা folder থেকে `Multi Agent.exe` চালু করুন।
4. Windows security warning দেখালে publisher ও download source যাচাই করুন;
   অচেনা বা অননুমোদিত source থেকে পাওয়া file চালাবেন না।

বর্তমান Windows release ZIP archive হিসেবে দেওয়া হয়; ZIP extract করলেই ব্যবহার
করা যায়। App চালানোর আগে Chrome, Edge অথবা Brave install করা থাকতে হবে, কারণ
Multi Agent সেই browser-কে profile-এর জন্য চালু করে।

## প্রথমবার ব্যবহার

1. App খুলে administrator-এর দেওয়া email ও password দিয়ে sign in করুন।
2. Dashboard-এ নতুন profile তৈরি করুন অথবা account-এ আগে থেকে থাকা profile
   বেছে নিন।
3. প্রয়োজন অনুযায়ী browser, privacy preset ও proxy configure করুন।
4. **Start** চাপলে profile-এর আলাদা browser session চালু হবে।
5. Profile পরিবর্তন অন্য device-এ পাঠাতে account-এ sign in করে sync ব্যবহার
   করুন।

## সহায়তা ও সমস্যা জানানো

Bug বা feature request জানাতে [GitHub Issues](https://github.com/thedeba/Privacy-Browser/issues)
ব্যবহার করুন। সমস্যা জানানোর সময় app version, operating system এবং সমস্যাটি
পুনরায় ঘটানোর ধাপ লিখুন। Password, proxy credential, Firebase secret বা
ব্যক্তিগত browsing data কখনো issue-তে প্রকাশ করবেন না।
