/**
 * Demo conversations served by /api/samples. "{{me}}" is replaced on the device
 * with the user's own name, so the server never learns who the user is.
 * Each entry: [minutes ago, author, text]
 */
type Row = [number, string, string];

export interface SampleConv {
  name: string;
  readCount: number; // how many of the oldest messages count as already read
  rows: Row[];
}

const ME = "{{me}}";

export const SAMPLES: SampleConv[] = [
  {
    name: "Hackathon Squad 🚀",
    readCount: 6,
    rows: [
      [1460, "Arjun", "Guys hackathon registration is open, team of 4 max"],
      [1455, "Priya", "I'm in!"],
      [1450, "Kabir", "same same"],
      [1440, ME, "Count me in. I'll handle the frontend"],
      [1420, "Arjun", "Nice. I'll register us tonight"],
      [1415, "Kabir", "😂😂"],
      [300, "Priya", "Morning people ☀️"],
      [298, "Kabir", "gm"],
      [290, "Arjun", "Ok so we decided: we're going with Next.js + Supabase for the stack, final hai"],
      [287, "Kabir", "👍"],
      [280, "Priya", "Has anyone seen the problem statements yet?"],
      [276, "Kabir", "not yet bro"],
      [270, "Arjun", "They'll announce at 12"],
      [180, "Kabir", "lol did you see the free pizza line"],
      [178, "Priya", "hahaha yes it's insane"],
      [176, "Kabir", "I'm not standing in that"],
      [120, "Arjun", `@${ME} can you set up the GitHub repo and add all of us before 2pm? Judges want commit history`],
      [118, "Priya", "Also we need the pitch deck by 4:30 pm, I'll start the slides"],
      [115, "Kabir", "I'll do the database schema"],
      [90, "Arjun", "URGENT: mentors said Vercel deploy link must be submitted on the portal by 5pm today, no extensions!!"],
      [85, "Priya", "noted"],
      [60, "Kabir", "anyone have a charger? mine died"],
      [58, "Priya", "I have one, table 12"],
      [40, "Arjun", `${ME} what's the status on the landing page? need to show mentors at 3`],
      [30, "Kabir", "brb getting chai"],
      [12, "Priya", "@everyone please fill the team feedback form before end of day"],
    ],
  },
  {
    name: "Rohan (Client · Bakery site)",
    readCount: 2,
    rows: [
      [2900, "Rohan", "Hi, loved the first draft of the website!"],
      [2895, ME, "Thanks Rohan! Will send the next version soon"],
      [600, "Rohan", "Hey, one thing — can you change the menu prices section? New prices attached in the PDF I emailed"],
      [598, "Rohan", "Also my wife wants the logo bigger 😅"],
      [420, "Rohan", "Are we still on track to go live by Saturday? We have a launch event Sunday"],
      [300, "Rohan", "Approved the green colour scheme btw, let's go with that"],
      [100, "Rohan", "Please share the invoice by Monday so I can process payment"],
    ],
  },
  {
    name: "CSE-B Class Group",
    readCount: 3,
    rows: [
      [3000, "Neha (CR)", "Good morning everyone"],
      [2990, "Vikram", "gm"],
      [2985, "Sana", "gm gm"],
      [800, "Vikram", "Anyone going to the fest tonight?"],
      [790, "Sana", "Yesss"],
      [785, "Rahul", "me too"],
      [780, "Vikram", "Let's meet at the gate at 7"],
      [700, "Sana", "Who took my notebook from the lab 😭"],
      [690, "Rahul", "not me"],
      [500, "Neha (CR)", "Important: DBMS assignment 3 submission deadline is 14th Oct, 11:59 pm on the portal. Late submissions will not be accepted"],
      [495, "Vikram", "😭😭😭"],
      [490, "Rahul", "Bro what"],
      [480, "Sana", "Is it individual or group?"],
      [475, "Neha (CR)", "Individual"],
      [400, "Rahul", "Anyone has the OS notes for unit 2?"],
      [395, "Sana", "check the drive"],
      [350, "Vikram", "lol the canteen samosa is back"],
      [345, "Rahul", "finally"],
      [200, "Neha (CR)", "Sir said tomorrow's 9am class is shifted to Lab 3. Also bring your lab record, it's mandatory"],
      [190, "Vikram", "ok"],
      [150, "Rahul", "😴"],
      [70, "Neha (CR)", `@${ME} you haven't paid the class trip fee yet, please pay by Friday, ₹1200`],
      [20, "Sana", "Anyone up for badminton?"],
    ],
  },
  {
    name: "Family ❤️",
    readCount: 2,
    rows: [
      [1500, "Mom", "Did you eat?"],
      [1490, ME, "Yes ma"],
      [480, "Dad", "Forwarded: 10 amazing benefits of drinking warm water 🌿"],
      [470, "Mom", "Beta kal subah 8 baje dentist appointment hai, yaad se aana"],
      [460, "Didi", "lol dad stop forwarding these"],
      [455, "Dad", "😂"],
      [200, "Mom", "Bring curd on the way home"],
      [60, "Didi", "Mom's birthday is next week, we decided on the surprise dinner at Truffles. Pls send me your share by tomorrow"],
    ],
  },
  {
    name: "Flatmates 🏠",
    readCount: 1,
    rows: [
      [1000, "Aditya", "Who finished the milk 😑"],
      [900, "Karan", "wasn't me"],
      [600, "Aditya", "Rent is due on the 10th, transfer to the owner directly pls"],
      [580, "Karan", "Wifi bill also pending, I paid it. Everyone send me ₹350"],
      [400, "Aditya", "Plumber coming tomorrow 11am, someone needs to be home"],
      [380, "Karan", `${ME} you're free tomorrow morning right? can you be there?`],
    ],
  },
];
