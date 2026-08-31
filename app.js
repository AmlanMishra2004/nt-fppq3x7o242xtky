const STORAGE_KEY = "nt-reader";
const FONT_MIN = 1;
const FONT_MAX = 1.75;
const FONT_STEP = 0.125;

const app = document.getElementById("app");
const titleEl = document.getElementById("title");
const backBtn = document.getElementById("back");
const backLabel = document.getElementById("back-label");
const themeBtn = document.getElementById("theme");
const langBtn = document.getElementById("lang");
const verseNumbersBtn = document.getElementById("verse-numbers");
const readAloudBtn = document.getElementById("read-aloud");
const fontDownBtn = document.getElementById("font-down");
const fontUpBtn = document.getElementById("font-up");
const speechSupported = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const LANGUAGES = {
  en: { file: "data/nt.json", label: "English", speech: "en-US" },
  hi: { file: "data/hi.json", label: "Hinglish", speech: "hi-IN" },
};
const loading = {};

// Books listed in canonical order; this also drives next/previous chapter flow.
const PARTS = [
  {
    name: "Old Part",
    sections: [
      { name: "Law & History", ids: ["genesis", "exodus", "ruth", "nehemiah", "esther"] },
      {
        name: "Wisdom & Poetry",
        ids: ["job", "psalms", "proverbs", "ecclesiastes", "song-of-solomon"],
      },
      { name: "Prophets", ids: ["isaiah", "lamentations", "daniel", "jonah", "micah"] },
    ],
  },
  {
    name: "New Part",
    sections: [
      { name: "Life of Yeshu", ids: ["matthew", "mark", "luke", "john"] },
      { name: "Acts", ids: ["acts"] },
      {
        name: "Paul's Letters",
        ids: [
          "romans",
          "1-corinthians",
          "2-corinthians",
          "galatians",
          "ephesians",
          "philippians",
          "colossians",
          "1-thessalonians",
          "2-thessalonians",
          "1-timothy",
          "2-timothy",
          "titus",
          "philemon",
        ],
      },
      {
        name: "Other Letters",
        ids: ["hebrews", "james", "1-peter", "2-peter", "1-john", "2-john", "3-john"],
      },
    ],
  },
  {
    name: "Mother Mary",
    sections: [
      { name: "Passages", ids: ["mother"] },
      { name: "Prayers", ids: ["prayers-to-mary", "akathist", "dante"] },
      {
        name: "Her Story",
        ids: ["guadalupe", "fatima", "birth-of-mary", "mary-and-the-child"],
      },
      { name: "Mothering", ids: ["julian"] },
    ],
  },
];

// Passage collections assembled from verses already in the data, so they work
// in every language and never duplicate text.
const COLLECTIONS = [
  {
    id: "mother",
    name: "Mary in the Bible",
    passages: [
      { label: "A child is coming", ref: ["luke", 1, 26, 38] },
      { label: "Mary and Elizabeth", ref: ["luke", 1, 39, 56] },
      { label: "The birth", ref: ["luke", 2, 1, 20] },
      { label: "She kept it in her heart", ref: ["luke", 2, 41, 52] },
      { label: "His mother at the wedding", ref: ["john", 2, 1, 11] },
      { label: "Here is your mother", ref: ["john", 19, 25, 27] },
      { label: "Mary among them", ref: ["acts", 1, 12, 14] },
      { label: "Blessed is the womb", ref: ["luke", 11, 27, 28] },
      { label: "As a hen gathers her chicks", ref: ["luke", 13, 31, 35] },
      { label: "A weaned child with its mother", ref: ["psalms", 131, 1, 3] },
      { label: "Wisdom calls out", ref: ["proverbs", 8, 1, 11] },
      { label: "Wisdom, from the beginning", ref: ["proverbs", 8, 22, 31] },
    ],
  },
];

// Readings for a state of mind. Same passage shape as COLLECTIONS: whatever is
// missing from a language is dropped when the collection is built.
const TOPICS = [
  {
    group: "When It Hurts",
    topics: [
      {
        id: "feel-sadness",
        name: "Sadness",
        passages: [
          { label: "Why are you cast down?", ref: ["psalms", 42, 1, 11] },
          { label: "My tears in your bottle", ref: ["psalms", 56, 8, 13] },
          { label: "Near to the broken-hearted", ref: ["psalms", 34, 15, 22] },
          { label: "He heals the broken", ref: ["psalms", 147, 1, 6] },
          { label: "Weeping stays the night", ref: ["psalms", 30, 1, 12] },
          { label: "A time to weep", ref: ["ecclesiastes", 3, 1, 8] },
          { label: "Comfort for those who mourn", ref: ["isaiah", 61, 1, 3] },
          { label: "Blessed are those who mourn", ref: ["matthew", 5, 1, 12] },
        ],
      },
      {
        id: "feel-grief",
        name: "Grief and Loss",
        passages: [
          { label: "Though I walk through the valley", ref: ["psalms", 23, 1, 6] },
          { label: "A refuge in trouble", ref: ["psalms", 46, 1, 11] },
          { label: "Yeshu wept", ref: ["john", 11, 28, 44] },
          { label: "Job's first loss", ref: ["job", 1, 13, 22] },
          { label: "Do not let your heart be troubled", ref: ["john", 14, 1, 14] },
          { label: "Every tear wiped away", ref: ["isaiah", 25, 6, 9] },
          { label: "Naomi returns empty", ref: ["ruth", 1, 15, 22] },
        ],
      },
      {
        id: "feel-pain",
        name: "Pain and Illness",
        passages: [
          { label: "Have mercy, I am weak", ref: ["psalms", 6, 1, 10] },
          { label: "I waited patiently", ref: ["psalms", 40, 1, 5] },
          { label: "He carried our sorrows", ref: ["isaiah", 53, 1, 6] },
          { label: "A woman healed by touch", ref: ["mark", 5, 25, 34] },
          { label: "The man at the pool", ref: ["john", 5, 1, 15] },
          { label: "Job answers out of the pain", ref: ["job", 3, 20, 26] },
          { label: "Strength for the weary", ref: ["isaiah", 40, 27, 31] },
        ],
      },
      {
        id: "feel-despair",
        name: "Despair",
        passages: [
          { label: "Out of the depths", ref: ["psalms", 130, 1, 8] },
          { label: "Darkness is my closest friend", ref: ["psalms", 88, 1, 18] },
          { label: "New every morning", ref: ["lamentations", 3, 19, 33] },
          { label: "Jonah from the deep", ref: ["jonah", 2, 1, 10] },
          { label: "Elijah under the tree", ref: ["psalms", 143, 1, 12] },
          { label: "A bruised reed he will not break", ref: ["isaiah", 42, 1, 9] },
        ],
      },
      {
        id: "feel-loneliness",
        name: "Loneliness",
        passages: [
          { label: "Turn to me, I am alone", ref: ["psalms", 25, 14, 22] },
          { label: "Where can I go from your spirit?", ref: ["psalms", 139, 1, 18] },
          { label: "Two are better than one", ref: ["ecclesiastes", 4, 7, 12] },
          { label: "Where you go, I will go", ref: ["ruth", 1, 1, 18] },
          { label: "I will not leave you orphaned", ref: ["john", 14, 15, 27] },
          { label: "A father to the fatherless", ref: ["psalms", 68, 1, 6] },
        ],
      },
      {
        id: "feel-abuse",
        name: "Abuse and Mistreatment",
        passages: [
          { label: "Why do you stand far off?", ref: ["psalms", 10, 1, 18] },
          { label: "You have seen my affliction", ref: ["psalms", 31, 1, 16] },
          { label: "The violent will not rule", ref: ["psalms", 140, 1, 13] },
          { label: "Rescue me from my pursuers", ref: ["psalms", 142, 1, 7] },
          { label: "Bind up the broken-hearted", ref: ["isaiah", 61, 1, 4] },
          { label: "Learn to do right, defend the wronged", ref: ["isaiah", 1, 16, 20] },
          { label: "Woe to those who make unjust laws", ref: ["isaiah", 10, 1, 4] },
        ],
      },
      {
        id: "feel-betrayal",
        name: "Betrayal",
        passages: [
          { label: "A close friend has turned", ref: ["psalms", 55, 1, 23] },
          { label: "They repay evil for good", ref: ["psalms", 41, 1, 13] },
          { label: "Peter warms his hands", ref: ["luke", 22, 54, 62] },
          { label: "Judas in the garden", ref: ["mark", 14, 43, 52] },
          { label: "Better a poor man than a liar", ref: ["proverbs", 19, 1, 9] },
        ],
      },
      {
        id: "feel-injustice",
        name: "Injustice",
        passages: [
          { label: "Do not fret over evildoers", ref: ["psalms", 37, 1, 11] },
          { label: "Why do the wicked prosper?", ref: ["psalms", 73, 1, 28] },
          { label: "Defend the weak", ref: ["psalms", 82, 1, 8] },
          { label: "The oppression I saw", ref: ["ecclesiastes", 4, 1, 6] },
          { label: "What is required of you", ref: ["micah", 6, 6, 8] },
          { label: "The fast that is chosen", ref: ["isaiah", 58, 1, 12] },
        ],
      },
      {
        id: "feel-slander",
        name: "Being Lied About",
        passages: [
          { label: "Guard me from lying tongues", ref: ["psalms", 120, 1, 7] },
          { label: "They surround me with words of hate", ref: ["psalms", 109, 1, 5] },
          { label: "Vindicate me", ref: ["psalms", 26, 1, 12] },
          { label: "A false witness will not go free", ref: ["proverbs", 19, 5, 9] },
          { label: "He did not open his mouth", ref: ["isaiah", 53, 7, 12] },
        ],
      },
    ],
  },
  {
    group: "When It Is Unclear",
    topics: [
      {
        id: "feel-doubt",
        name: "Doubt",
        passages: [
          { label: "How long, will you forget me?", ref: ["psalms", 13, 1, 6] },
          { label: "I believe; help my unbelief", ref: ["mark", 9, 14, 29] },
          { label: "If only I knew where to find him", ref: ["job", 23, 1, 12] },
          { label: "Are you the one?", ref: ["matthew", 11, 1, 11] },
          { label: "The Lord answers Job", ref: ["job", 38, 1, 21] },
          { label: "Job answers back", ref: ["job", 42, 1, 6] },
        ],
      },
      {
        id: "feel-confusion",
        name: "Confusion",
        passages: [
          { label: "Show me the way I should go", ref: ["psalms", 143, 1, 12] },
          { label: "Trust and do not lean on your own understanding", ref: ["proverbs", 3, 1, 12] },
          { label: "A word behind you: this is the way", ref: ["isaiah", 30, 18, 21] },
          { label: "My thoughts are not your thoughts", ref: ["isaiah", 55, 1, 13] },
          { label: "Ask, and it will be given", ref: ["matthew", 7, 7, 14] },
          { label: "Wisdom, if you ask for it", ref: ["james", 1, 1, 8] },
        ],
      },
      {
        id: "feel-uncertainty",
        name: "Uncertainty",
        passages: [
          { label: "Do not worry about tomorrow", ref: ["matthew", 6, 25, 34] },
          { label: "My times are in your hands", ref: ["psalms", 31, 9, 24] },
          { label: "The one who keeps you will not sleep", ref: ["psalms", 121, 1, 8] },
          { label: "Do not boast about tomorrow", ref: ["proverbs", 27, 1, 12] },
          { label: "A season for everything", ref: ["ecclesiastes", 3, 1, 14] },
          { label: "Do not fear, I hold your hand", ref: ["isaiah", 41, 8, 13] },
        ],
      },
      {
        id: "feel-decisions",
        name: "Hard Decisions",
        passages: [
          { label: "Teach me your paths", ref: ["psalms", 25, 1, 15] },
          { label: "Commit your work", ref: ["proverbs", 16, 1, 9] },
          { label: "Plans succeed with counsel", ref: ["proverbs", 15, 21, 33] },
          { label: "Ruth chooses", ref: ["ruth", 1, 1, 18] },
          { label: "Counting the cost", ref: ["luke", 14, 25, 35] },
          { label: "Two houses, two foundations", ref: ["matthew", 7, 24, 29] },
        ],
      },
      {
        id: "feel-waiting",
        name: "Waiting",
        passages: [
          { label: "Wait for the Lord", ref: ["psalms", 27, 7, 14] },
          { label: "I waited, and he heard", ref: ["psalms", 40, 1, 8] },
          { label: "My soul waits like a watchman", ref: ["psalms", 130, 1, 8] },
          { label: "They will run and not grow weary", ref: ["isaiah", 40, 27, 31] },
          { label: "Hope deferred", ref: ["proverbs", 13, 12, 19] },
          { label: "Hope deferred, then fulfilled", ref: ["proverbs", 13, 12, 19] },
        ],
      },
      {
        id: "feel-unheard",
        name: "Feeling Unheard",
        passages: [
          { label: "My God, why?", ref: ["psalms", 22, 1, 11] },
          { label: "Do not be silent", ref: ["psalms", 28, 1, 9] },
          { label: "I cry by day and you do not answer", ref: ["psalms", 22, 12, 24] },
          { label: "Keep asking", ref: ["luke", 11, 5, 13] },
          { label: "The widow and the judge", ref: ["luke", 18, 1, 8] },
          { label: "He is not far", ref: ["acts", 17, 22, 31] },
        ],
      },
    ],
  },
  {
    group: "When Fear Rises",
    topics: [
      {
        id: "feel-fear",
        name: "Fear",
        passages: [
          { label: "Whom shall I fear?", ref: ["psalms", 27, 1, 6] },
          { label: "In the shelter of the Most High", ref: ["psalms", 91, 1, 16] },
          { label: "When I am afraid I trust", ref: ["psalms", 56, 1, 13] },
          { label: "Do not be afraid, I am with you", ref: ["isaiah", 43, 1, 7] },
          { label: "Peace, be still", ref: ["mark", 4, 35, 41] },
          { label: "Walking on the water", ref: ["matthew", 14, 22, 33] },
        ],
      },
      {
        id: "feel-anxiety",
        name: "Anxiety",
        passages: [
          { label: "Look at the birds", ref: ["matthew", 6, 25, 34] },
          { label: "Be still and know", ref: ["psalms", 46, 1, 11] },
          { label: "Cast your burden", ref: ["psalms", 55, 16, 23] },
          { label: "Do not be anxious about anything", ref: ["philippians", 4, 4, 13] },
          { label: "Martha, worried about many things", ref: ["luke", 10, 38, 42] },
          { label: "Perfect peace for a steady mind", ref: ["isaiah", 26, 1, 9] },
        ],
      },
      {
        id: "feel-danger",
        name: "Danger",
        passages: [
          { label: "A very present help", ref: ["psalms", 46, 1, 7] },
          { label: "The Lord is my rock", ref: ["psalms", 18, 1, 19] },
          { label: "Through the waters and the fire", ref: ["isaiah", 43, 1, 5] },
          { label: "The furnace", ref: ["daniel", 3, 1, 30] },
          { label: "The lions", ref: ["daniel", 6, 1, 28] },
          { label: "The storm at sea", ref: ["jonah", 1, 1, 17] },
        ],
      },
      {
        id: "feel-enemies",
        name: "Facing Enemies",
        passages: [
          { label: "You prepare a table before me", ref: ["psalms", 23, 1, 6] },
          { label: "Plead my cause", ref: ["psalms", 35, 1, 10] },
          { label: "Love your enemies", ref: ["matthew", 5, 38, 48] },
          { label: "Do not repay evil", ref: ["proverbs", 25, 15, 22] },
          { label: "Bless those who curse you", ref: ["luke", 6, 27, 36] },
        ],
      },
      {
        id: "feel-persecution",
        name: "Being Persecuted",
        passages: [
          { label: "Blessed are the persecuted", ref: ["matthew", 5, 1, 16] },
          { label: "Reproach falls on me", ref: ["psalms", 69, 1, 18] },
          { label: "They rejoiced to be counted worthy", ref: ["acts", 5, 27, 42] },
          { label: "Stephen looks up", ref: ["acts", 7, 51, 60] },
          { label: "Do not fear their threats", ref: ["isaiah", 51, 7, 16] },
        ],
      },
    ],
  },
  {
    group: "When You Turn Inward",
    topics: [
      {
        id: "feel-shame",
        name: "Shame",
        passages: [
          { label: "Those who look to him are radiant", ref: ["psalms", 34, 1, 10] },
          { label: "Let me not be put to shame", ref: ["psalms", 25, 1, 11] },
          { label: "The woman they dragged in", ref: ["john", 8, 1, 11] },
          { label: "The woman at the well", ref: ["john", 4, 1, 30] },
          { label: "Instead of shame, a double portion", ref: ["isaiah", 61, 4, 11] },
        ],
      },
      {
        id: "feel-worthless",
        name: "Feeling Worthless",
        passages: [
          { label: "Fearfully and wonderfully made", ref: ["psalms", 139, 13, 24] },
          { label: "What is a human being?", ref: ["psalms", 8, 1, 9] },
          { label: "Not one sparrow forgotten", ref: ["luke", 12, 4, 12] },
          { label: "You are precious in my eyes", ref: ["isaiah", 43, 1, 7] },
          { label: "Engraved on the palms of my hands", ref: ["isaiah", 49, 13, 16] },
        ],
      },
      {
        id: "feel-guilt",
        name: "Guilt and Regret",
        passages: [
          { label: "Create in me a clean heart", ref: ["psalms", 51, 1, 17] },
          { label: "As far as the east is from the west", ref: ["psalms", 103, 1, 14] },
          { label: "Though your wrongs are scarlet", ref: ["isaiah", 1, 16, 20] },
          { label: "The son who came home", ref: ["luke", 15, 11, 32] },
          { label: "The sheep that was lost", ref: ["luke", 15, 1, 10] },
        ],
      },
      {
        id: "feel-anger",
        name: "Anger",
        passages: [
          { label: "Be angry and do not wrong", ref: ["psalms", 4, 1, 8] },
          { label: "A soft answer", ref: ["proverbs", 15, 1, 18] },
          { label: "Slow to anger is better than mighty", ref: ["proverbs", 16, 24, 33] },
          { label: "Quick to hear, slow to anger", ref: ["james", 1, 19, 27] },
          { label: "Jonah is angry", ref: ["jonah", 4, 1, 11] },
        ],
      },
      {
        id: "feel-envy",
        name: "Envy and Comparison",
        passages: [
          { label: "I envied the arrogant", ref: ["psalms", 73, 1, 26] },
          { label: "Better a handful of quiet", ref: ["ecclesiastes", 4, 1, 12] },
          { label: "Envy rots the bones", ref: ["proverbs", 14, 26, 35] },
          { label: "The workers hired late", ref: ["matthew", 20, 1, 16] },
          { label: "Do not envy the arrogant", ref: ["proverbs", 23, 17, 21] },
        ],
      },
      {
        id: "feel-pride",
        name: "Pride",
        passages: [
          { label: "Pride goes before a fall", ref: ["proverbs", 16, 16, 24] },
          { label: "Do not seek the best seat", ref: ["luke", 14, 7, 14] },
          { label: "Two men praying", ref: ["luke", 18, 9, 14] },
          { label: "He washed their feet", ref: ["john", 13, 1, 17] },
          { label: "Nebuchadnezzar humbled", ref: ["daniel", 4, 1, 37] },
        ],
      },
      {
        id: "feel-temptation",
        name: "Temptation",
        passages: [
          { label: "In the wilderness", ref: ["matthew", 4, 1, 11] },
          { label: "Keep my steps from slipping", ref: ["psalms", 17, 1, 15] },
          { label: "Guard your heart", ref: ["proverbs", 4, 20, 27] },
          { label: "Watch and pray", ref: ["mark", 14, 32, 42] },
          { label: "A way out", ref: ["1-corinthians", 10, 1, 13] },
        ],
      },
      {
        id: "feel-addiction",
        name: "Habits You Cannot Break",
        passages: [
          { label: "Bring me out of the pit", ref: ["psalms", 40, 1, 13] },
          { label: "The dog and its folly", ref: ["proverbs", 26, 1, 12] },
          { label: "Wine mocks", ref: ["proverbs", 23, 29, 35] },
          { label: "Set free indeed", ref: ["john", 8, 31, 36] },
          { label: "I do what I do not want", ref: ["romans", 7, 14, 25] },
        ],
      },
      {
        id: "feel-perfectionism",
        name: "Perfectionism",
        passages: [
          { label: "I do not concern myself with great matters", ref: ["psalms", 131, 1, 3] },
          { label: "Martha, worried about many things", ref: ["luke", 10, 38, 42] },
          { label: "Enough trouble for today", ref: ["matthew", 6, 25, 34] },
          { label: "Unless the builders labour in vain", ref: ["psalms", 127, 1, 5] },
          { label: "Do not be over-righteous", ref: ["ecclesiastes", 7, 15, 22] },
          { label: "He knows how we are formed", ref: ["psalms", 103, 8, 18] },
          { label: "A bruised reed he will not break", ref: ["isaiah", 42, 1, 9] },
        ],
      },
    ],
  },
  {
    group: "When Life Is Heavy",
    topics: [
      {
        id: "feel-exhaustion",
        name: "Exhaustion",
        passages: [
          { label: "Come to me, all who are weary", ref: ["matthew", 11, 25, 30] },
          { label: "He restores my soul", ref: ["psalms", 23, 1, 6] },
          { label: "He gives his beloved sleep", ref: ["psalms", 127, 1, 5] },
          { label: "Renewed strength", ref: ["isaiah", 40, 25, 31] },
          { label: "Come away and rest", ref: ["mark", 6, 30, 44] },
        ],
      },
      {
        id: "feel-failure",
        name: "Failure",
        passages: [
          { label: "Though he stumble, he will not fall", ref: ["psalms", 37, 23, 34] },
          { label: "Fishing all night, nothing caught", ref: ["luke", 5, 1, 11] },
          { label: "Seven times he rises", ref: ["proverbs", 24, 10, 20] },
          { label: "Job's ending", ref: ["job", 42, 7, 17] },
          { label: "A new thing in the wilderness", ref: ["isaiah", 43, 14, 21] },
        ],
      },
      {
        id: "feel-money",
        name: "Money and Need",
        passages: [
          { label: "I have not seen the just forsaken", ref: ["psalms", 37, 16, 26] },
          { label: "Give us today our bread", ref: ["matthew", 6, 5, 15] },
          { label: "Consider the lilies", ref: ["luke", 12, 22, 34] },
          { label: "Better a little with peace", ref: ["proverbs", 15, 13, 22] },
          { label: "Neither poverty nor riches", ref: ["proverbs", 30, 1, 9] },
          { label: "The widow's two coins", ref: ["mark", 12, 38, 44] },
        ],
      },
      {
        id: "feel-work",
        name: "Work and Toil",
        passages: [
          { label: "Establish the work of our hands", ref: ["psalms", 90, 1, 17] },
          { label: "What do people gain from toil?", ref: ["ecclesiastes", 2, 17, 26] },
          { label: "Eat, drink, find good in your labour", ref: ["ecclesiastes", 3, 9, 22] },
          { label: "The diligent hand", ref: ["proverbs", 10, 1, 12] },
          { label: "Rebuilding the wall", ref: ["nehemiah", 4, 1, 23] },
        ],
      },
      {
        id: "feel-procrastination",
        name: "Putting Things Off",
        passages: [
          { label: "Go to the ant", ref: ["proverbs", 6, 6, 11] },
          { label: "The field of the sluggard", ref: ["proverbs", 24, 30, 34] },
          { label: "Whoever watches the wind will not sow", ref: ["ecclesiastes", 11, 1, 6] },
          { label: "Do it with your might", ref: ["ecclesiastes", 9, 7, 12] },
          { label: "The sluggard craves and gets nothing", ref: ["proverbs", 13, 4, 12] },
          { label: "Teach us to number our days", ref: ["psalms", 90, 10, 17] },
          { label: "Do not say, come back tomorrow", ref: ["proverbs", 3, 27, 35] },
        ],
      },
      {
        id: "feel-sleepless",
        name: "Sleepless Nights",
        passages: [
          { label: "In peace I lie down", ref: ["psalms", 4, 1, 8] },
          { label: "I remember you in the night", ref: ["psalms", 63, 1, 11] },
          { label: "You will not fear the terror of night", ref: ["psalms", 91, 1, 11] },
          { label: "My eyes stay open", ref: ["psalms", 77, 1, 20] },
          { label: "He prayed before dawn", ref: ["mark", 1, 29, 39] },
        ],
      },
      {
        id: "feel-oldage",
        name: "Growing Old",
        passages: [
          { label: "Do not cast me off in old age", ref: ["psalms", 71, 1, 24] },
          { label: "Teach us to number our days", ref: ["psalms", 90, 1, 17] },
          { label: "Even to your grey hairs I carry you", ref: ["isaiah", 46, 3, 13] },
          { label: "Remember your creator", ref: ["ecclesiastes", 12, 1, 8] },
          { label: "Grey hair is a crown", ref: ["proverbs", 16, 24, 33] },
          { label: "Simeon and Anna", ref: ["luke", 2, 21, 40] },
        ],
      },
      {
        id: "feel-stranger",
        name: "Being a Stranger",
        passages: [
          { label: "By the rivers of a strange land", ref: ["psalms", 137, 1, 6] },
          { label: "The Lord watches over the stranger", ref: ["psalms", 146, 1, 10] },
          { label: "Ruth in a foreign field", ref: ["ruth", 2, 1, 23] },
          { label: "Do not neglect the guest", ref: ["hebrews", 13, 1, 6] },
          { label: "Love the stranger among you", ref: ["exodus", 3, 1, 12] },
        ],
      },
      {
        id: "feel-startover",
        name: "Starting Over",
        passages: [
          { label: "See, I am doing a new thing", ref: ["isaiah", 43, 14, 21] },
          { label: "Mercies new every morning", ref: ["lamentations", 3, 19, 26] },
          { label: "Born again, said at night", ref: ["john", 3, 1, 17] },
          { label: "Abram sets out", ref: ["genesis", 12, 1, 9] },
          { label: "Return and rebuild", ref: ["nehemiah", 2, 1, 20] },
        ],
      },
    ],
  },
  {
    group: "When It Is About People",
    topics: [
      {
        id: "feel-family",
        name: "Family Conflict",
        passages: [
          { label: "Joseph and his brothers", ref: ["genesis", 45, 1, 15] },
          { label: "How good when kin dwell together", ref: ["psalms", 133, 1, 3] },
          { label: "A brother offended", ref: ["proverbs", 18, 13, 24] },
          { label: "Forgive seventy-seven times", ref: ["matthew", 18, 21, 35] },
          { label: "The older brother outside", ref: ["luke", 15, 25, 32] },
        ],
      },
      {
        id: "feel-love",
        name: "Love and Marriage",
        passages: [
          { label: "Love is patient", ref: ["1-corinthians", 13, 1, 13] },
          { label: "Set me as a seal", ref: ["song-of-solomon", 8, 1, 7] },
          { label: "My beloved is mine", ref: ["song-of-solomon", 2, 1, 17] },
          { label: "A cord of three strands", ref: ["ecclesiastes", 4, 7, 12] },
          { label: "Love one another", ref: ["1-john", 4, 7, 21] },
        ],
      },
      {
        id: "feel-parenting",
        name: "Parenting",
        passages: [
          { label: "Children are a gift", ref: ["psalms", 127, 1, 5] },
          { label: "Train up a child", ref: ["proverbs", 22, 1, 16] },
          { label: "Let the children come", ref: ["mark", 10, 13, 16] },
          { label: "As a mother comforts", ref: ["isaiah", 66, 10, 14] },
          { label: "Hannah's song of a mother", ref: ["psalms", 113, 1, 9] },
        ],
      },
      {
        id: "feel-friendship",
        name: "Friendship",
        passages: [
          { label: "A friend loves at all times", ref: ["proverbs", 17, 1, 17] },
          { label: "Iron sharpens iron", ref: ["proverbs", 27, 1, 17] },
          { label: "No greater love", ref: ["john", 15, 9, 17] },
          { label: "They lowered him through the roof", ref: ["mark", 2, 1, 12] },
          { label: "Ruth and Naomi", ref: ["ruth", 1, 1, 18] },
        ],
      },
      {
        id: "feel-forgiving",
        name: "Forgiving Someone",
        passages: [
          { label: "As we forgive", ref: ["matthew", 6, 5, 15] },
          { label: "The unforgiving servant", ref: ["matthew", 18, 21, 35] },
          { label: "Joseph forgives", ref: ["genesis", 50, 15, 21] },
          { label: "Do not repay evil for evil", ref: ["romans", 12, 9, 21] },
          { label: "Father, forgive them", ref: ["luke", 23, 32, 43] },
        ],
      },
      {
        id: "feel-caring",
        name: "Caring for Someone Ill",
        passages: [
          { label: "The good Samaritan", ref: ["luke", 10, 25, 37] },
          { label: "Carrying each other's load", ref: ["galatians", 6, 1, 10] },
          { label: "Jairus asks for his daughter", ref: ["mark", 5, 21, 24] },
          { label: "Weep with those who weep", ref: ["romans", 12, 9, 16] },
          { label: "Job's friends sit with him", ref: ["job", 2, 11, 13] },
        ],
      },
    ],
  },
  {
    group: "When You Want to Grow",
    topics: [
      {
        id: "feel-wisdom",
        name: "Needing Wisdom",
        passages: [
          { label: "Wisdom calls out", ref: ["proverbs", 8, 1, 21] },
          { label: "Get wisdom", ref: ["proverbs", 4, 1, 13] },
          { label: "Ask for wisdom", ref: ["james", 1, 1, 8] },
          { label: "Teach me your way", ref: ["psalms", 86, 1, 17] },
          { label: "A wise heart", ref: ["ecclesiastes", 7, 1, 14] },
        ],
      },
      {
        id: "feel-patience",
        name: "Patience",
        passages: [
          { label: "Be still before the Lord", ref: ["psalms", 37, 1, 11] },
          { label: "Better patient than proud", ref: ["ecclesiastes", 7, 1, 14] },
          { label: "I waited, and he heard", ref: ["psalms", 40, 1, 8] },
          { label: "Slow to anger", ref: ["proverbs", 14, 26, 35] },
          { label: "The seed grows secretly", ref: ["mark", 4, 26, 34] },
        ],
      },
      {
        id: "feel-courage",
        name: "Courage",
        passages: [
          { label: "Be strong, take heart", ref: ["psalms", 31, 19, 24] },
          { label: "The Lord is my light", ref: ["psalms", 27, 1, 14] },
          { label: "Do not fear, I will help you", ref: ["isaiah", 41, 8, 16] },
          { label: "Esther goes to the king", ref: ["esther", 4, 1, 17] },
          { label: "They would not bow", ref: ["daniel", 3, 8, 30] },
        ],
      },
      {
        id: "feel-humility",
        name: "Humility",
        passages: [
          { label: "A servant of all", ref: ["mark", 9, 30, 37] },
          { label: "Walk humbly", ref: ["micah", 6, 6, 8] },
          { label: "Wisdom comes with the humble", ref: ["proverbs", 11, 1, 14] },
          { label: "Washing feet", ref: ["john", 13, 1, 17] },
          { label: "My soul magnifies", ref: ["luke", 1, 46, 55] },
        ],
      },
      {
        id: "feel-prayer",
        name: "Learning to Pray",
        passages: [
          { label: "Teach us to pray", ref: ["luke", 11, 1, 13] },
          { label: "Go into your room", ref: ["matthew", 6, 5, 15] },
          { label: "Hear my prayer", ref: ["psalms", 5, 1, 12] },
          { label: "Morning by morning", ref: ["psalms", 143, 1, 12] },
          { label: "In everything, with thanks", ref: ["philippians", 4, 4, 9] },
        ],
      },
      {
        id: "feel-silence",
        name: "Silence and Solitude",
        passages: [
          { label: "Be still and know", ref: ["psalms", 46, 1, 11] },
          { label: "My soul waits in silence", ref: ["psalms", 62, 1, 12] },
          { label: "He went up alone", ref: ["matthew", 14, 22, 27] },
          { label: "A quiet place", ref: ["mark", 1, 32, 39] },
          { label: "Let your words be few", ref: ["ecclesiastes", 5, 1, 7] },
        ],
      },
    ],
  },
  {
    group: "When It Is Good",
    topics: [
      {
        id: "feel-gratitude",
        name: "Gratitude",
        passages: [
          { label: "Bless the Lord, my soul", ref: ["psalms", 103, 1, 22] },
          { label: "Enter with thanksgiving", ref: ["psalms", 100, 1, 5] },
          { label: "Give thanks, his love endures", ref: ["psalms", 136, 1, 9] },
          { label: "One came back", ref: ["luke", 17, 11, 19] },
          { label: "Whatever is true, think on it", ref: ["philippians", 4, 4, 9] },
        ],
      },
      {
        id: "feel-joy",
        name: "Joy",
        passages: [
          { label: "The joy of the morning", ref: ["psalms", 30, 1, 12] },
          { label: "Make a joyful noise", ref: ["psalms", 98, 1, 9] },
          { label: "You will go out in joy", ref: ["isaiah", 55, 6, 13] },
          { label: "That your joy may be full", ref: ["john", 15, 9, 17] },
          { label: "The joy of the Lord is your strength", ref: ["nehemiah", 8, 1, 12] },
        ],
      },
      {
        id: "feel-wonder",
        name: "Wonder",
        passages: [
          { label: "The heavens declare", ref: ["psalms", 19, 1, 14] },
          { label: "When I look at the stars", ref: ["psalms", 8, 1, 9] },
          { label: "You send the springs", ref: ["psalms", 104, 1, 24] },
          { label: "Where were you?", ref: ["job", 38, 1, 21] },
          { label: "Lift your eyes and see", ref: ["isaiah", 40, 21, 31] },
        ],
      },
      {
        id: "feel-peace",
        name: "Peace",
        passages: [
          { label: "Peace I leave with you", ref: ["john", 14, 25, 31] },
          { label: "He leads me beside still waters", ref: ["psalms", 23, 1, 6] },
          { label: "A quieted soul", ref: ["psalms", 131, 1, 3] },
          { label: "Peace like a river", ref: ["isaiah", 66, 10, 14] },
          { label: "Blessed are the peacemakers", ref: ["matthew", 5, 1, 12] },
        ],
      },
      {
        id: "feel-hope",
        name: "Hope",
        passages: [
          { label: "Hope in God", ref: ["psalms", 42, 1, 11] },
          { label: "My help comes from the Lord", ref: ["psalms", 121, 1, 8] },
          { label: "Great is your faithfulness", ref: ["lamentations", 3, 19, 33] },
          { label: "Those who hope will renew strength", ref: ["isaiah", 40, 27, 31] },
          { label: "A future and a hope", ref: ["romans", 8, 18, 39] },
        ],
      },
      {
        id: "feel-morning",
        name: "Beginning of the Day",
        passages: [
          { label: "In the morning you hear my voice", ref: ["psalms", 5, 1, 12] },
          { label: "This is the day", ref: ["psalms", 118, 19, 29] },
          { label: "Morning by morning he wakens me", ref: ["isaiah", 50, 4, 10] },
          { label: "Before daylight he prayed", ref: ["mark", 1, 32, 39] },
          { label: "Enough for today", ref: ["matthew", 6, 25, 34] },
        ],
      },
      {
        id: "feel-night",
        name: "End of the Day",
        passages: [
          { label: "In peace I will lie down", ref: ["psalms", 4, 1, 8] },
          { label: "He gives his beloved sleep", ref: ["psalms", 127, 1, 5] },
          { label: "He will not slumber", ref: ["psalms", 121, 1, 8] },
          { label: "Let my prayer rise like incense", ref: ["psalms", 141, 1, 10] },
          { label: "Now let your servant depart in peace", ref: ["luke", 2, 25, 35] },
        ],
      },
    ],
  },
];

for (const { topics } of TOPICS) COLLECTIONS.push(...topics);

PARTS.push({
  name: "When You Feel",
  sections: TOPICS.map(({ group, topics }) => ({
    name: group,
    ids: topics.map((topic) => topic.id),
  })),
});

function buildCollections(json) {
  for (const collection of COLLECTIONS) {
    const chapters = [];
    for (const { label, ref } of collection.passages) {
      const [bookId, chapterN, from, to] = ref;
      const book = json.books.find((item) => item.id === bookId);
      const chapter = book && book.chapters.find((item) => item.n === chapterN);
      if (!chapter) continue;
      const verses = chapter.verses.filter((verse) => verse.n >= from && verse.n <= to);
      if (!verses.length) continue;
      chapters.push({
        n: chapters.length + 1,
        label,
        source: `${book.name} ${chapterN}`,
        verses,
      });
    }
    if (chapters.length) {
      json.books.push({ id: collection.id, name: collection.name, chapters });
    }
  }
  return json;
}

let data = null;
let settings = loadSettings();
let speechState = "idle";
let speechSession = 0;

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function verseNumbersVisible() {
  return settings.verseNumbers === true;
}

function currentLang() {
  return settings.lang === "hi" ? "hi" : "en";
}

function otherLang() {
  return currentLang() === "hi" ? "en" : "hi";
}

function loadLanguage(lang) {
  if (!loading[lang]) {
    loading[lang] = fetch(LANGUAGES[lang].file, { cache: "reload" })
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the ${LANGUAGES[lang].label} text.`);
        return response.json();
      })
      .catch((error) => {
        delete loading[lang];
        throw error;
      });
  }
  return loading[lang];
}

function nextTheme(theme) {
  const themes = ["light", "comfort", "dark"];
  return themes[(themes.indexOf(theme) + 1) % themes.length];
}

const narrowHeader = window.matchMedia("(max-width: 430px)");

function applySettings() {
  const theme =
    settings.theme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const fontSize = settings.fontSize || 1.25;
  const showNumbers = verseNumbersVisible();
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.verseNumbers = showNumbers ? "on" : "off";
  document.documentElement.style.setProperty("--font-size", `${fontSize}rem`);
  const themeColor =
    theme === "dark" ? "#171410" : theme === "comfort" ? "#e6d7bc" : "#f4efe6";
  document.querySelector('meta[name="theme-color"]').setAttribute("content", themeColor);
  themeBtn.textContent = narrowHeader.matches
    ? "Theme"
    : theme === "dark"
      ? "Light"
      : theme === "comfort"
        ? "Night"
        : "Comfort";
  themeBtn.setAttribute(
    "aria-label",
    `Color mode: ${theme}. Switch to ${nextTheme(theme)} mode`
  );
  langBtn.textContent = LANGUAGES[otherLang()].label;
  langBtn.setAttribute("aria-label", `Switch to ${LANGUAGES[otherLang()].label}`);
  verseNumbersBtn.setAttribute("aria-pressed", showNumbers ? "true" : "false");
  verseNumbersBtn.setAttribute(
    "aria-label",
    showNumbers ? "Hide verse numbers" : "Show verse numbers"
  );
  updateReadAloudButton();
}

function bookById(id) {
  return data.books.find((book) => book.id === id);
}

// Parts with unlisted books appended, so new data never goes missing.
function parts() {
  const listed = new Set(PARTS.flatMap((t) => t.sections.flatMap((s) => s.ids)));
  const extra = data.books.map((book) => book.id).filter((id) => !listed.has(id));
  if (!extra.length) return PARTS;
  return [...PARTS, { name: "Other", sections: [{ name: "Other", ids: extra }] }];
}

function orderedBooks() {
  return parts()
    .flatMap((part) => part.sections.flatMap((section) => section.ids))
    .map(bookById)
    .filter(Boolean);
}

function chapterByNumber(book, number) {
  return book.chapters.find((chapter) => chapter.n === number);
}

function parseHash() {
  const raw = location.hash.replace(/^#/, "").replace(/^\/+|\/+$/g, "");
  if (!raw) return { view: "home" };
  const [bookId, chapterPart] = raw.split("/");
  const book = bookById(bookId);
  if (!book) return { view: "home" };
  if (!chapterPart) return { view: "book", book };
  const chapter = chapterByNumber(book, Number(chapterPart));
  if (!chapter) return { view: "book", book };
  return { view: "read", book, chapter };
}

function go(path) {
  const next = `#/${path}`.replace(/\/+$/, "");
  if (location.hash === next || (path === "" && (location.hash === "" || location.hash === "#/"))) {
    route();
    return;
  }
  location.hash = path ? `/${path}` : "";
}

function el(tag, props, ...children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === false || value == null) {
      return;
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  });
  for (const child of children) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

function rememberPlace(book, chapter) {
  settings.bookId = book.id;
  settings.chapter = chapter.n;
  saveSettings();
}

// Collapsed by default; remembers what the reader opened.
function disclosure(key, className, titleClass, title, body) {
  return el(
    "details",
    {
      class: className,
      open: settings.openSections?.[key] === true,
      onToggle: (event) => {
        settings.openSections = settings.openSections || {};
        settings.openSections[key] = event.currentTarget.open;
        saveSettings();
      },
    },
    el("summary", { class: titleClass }, title),
    body
  );
}

function renderHome() {
  titleEl.textContent = "The Book";
  backBtn.hidden = true;
  const lastBook = settings.bookId && bookById(settings.bookId);
  const lastChapter = lastBook && settings.chapter && chapterByNumber(lastBook, settings.chapter);
  const frag = document.createDocumentFragment();
  if (lastBook && lastChapter) {
    frag.append(
      el(
        "button",
        {
          type: "button",
          class: "continue",
          onClick: () => go(`${lastBook.id}/${lastChapter.n}`),
        },
        el("small", {}, "Continue reading"),
        el("strong", {}, lastChapter.label || `${lastBook.name} ${lastChapter.n}`)
      )
    );
  }
  for (const part of parts()) {
    const sections = part.sections
      .map((section) => ({ name: section.name, books: section.ids.map(bookById).filter(Boolean) }))
      .filter((section) => section.books.length);
    if (!sections.length) continue;
    const partBody = el("div", { class: "part-body" });
    for (const section of sections) {
      const list = el("div", { class: "book-list" });
      for (const book of section.books) {
        list.append(
          el(
            "button",
            {
              type: "button",
              class: "book-link",
              onClick: () => go(book.id),
            },
            el("span", { class: "book-name" }, book.name),
            el(
              "span",
              { class: "book-meta" },
              book.chapters.some((chapter) => chapter.label)
                ? `${book.chapters.length} readings`
                : `${book.chapters.length} ${book.chapters.length === 1 ? "chapter" : "chapters"}`
            )
          )
        );
      }
      partBody.append(
        disclosure(`${part.name}/${section.name}`, "section", "section-title", section.name, list)
      );
    }
    frag.append(
      disclosure(part.name, "part", "part-title", part.name, partBody)
    );
  }
  app.replaceChildren(frag);
}

function renderBook(book) {
  titleEl.textContent = book.name;
  backBtn.hidden = false;
  backLabel.textContent = "Books";
  backBtn.onclick = () => go("");
  const labelled = book.chapters.some((chapter) => chapter.label);
  const grid = el("div", { class: labelled ? "book-list" : "chapter-grid" });
  for (const chapter of book.chapters) {
    grid.append(
      el(
        "button",
        {
          type: "button",
          class: labelled ? "book-link" : "chapter-btn",
          onClick: () => go(`${book.id}/${chapter.n}`),
        },
        labelled ? el("span", { class: "book-name" }, chapter.label) : String(chapter.n),
        labelled ? el("span", { class: "book-meta" }, chapter.source) : null
      )
    );
  }
  app.replaceChildren(grid);
}

function neighbor(book, chapter, delta) {
  const books = orderedBooks();
  const bookIndex = books.findIndex((item) => item.id === book.id);
  const chapterIndex = book.chapters.findIndex((item) => item.n === chapter.n);
  const nextIndex = chapterIndex + delta;
  if (nextIndex >= 0 && nextIndex < book.chapters.length) {
    return { book, chapter: book.chapters[nextIndex] };
  }
  const nextBook = books[bookIndex + delta];
  if (!nextBook) return null;
  return {
    book: nextBook,
    chapter: delta > 0 ? nextBook.chapters[0] : nextBook.chapters[nextBook.chapters.length - 1],
  };
}

function updateReadAloudButton() {
  const isReading = document.body.classList.contains("reading");
  readAloudBtn.hidden = !speechSupported || !isReading;
  if (readAloudBtn.hidden) return;

  const paused = speechState === "paused";
  const active = speechState === "speaking" || paused;
  readAloudBtn.textContent = paused ? "Resume" : active ? "Pause" : "Listen";
  readAloudBtn.setAttribute("aria-pressed", active ? "true" : "false");
  readAloudBtn.setAttribute(
    "aria-label",
    paused
      ? "Resume reading aloud"
      : active
        ? "Pause reading aloud"
        : "Read this chapter aloud"
  );
}

function stopSpeech() {
  speechSession += 1;
  if (speechSupported) window.speechSynthesis.cancel();
  speechState = "idle";
  updateReadAloudButton();
}

function speakChapter(book, chapter) {
  if (!speechSupported) return;

  stopSpeech();
  const session = ++speechSession;
  const text = `${book.name}, chapter ${chapter.n}. ${chapter.verses
    .map((verse) => verse.t)
    .join(" ")}`;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANGUAGES[currentLang()].speech;

  utterance.onend = utterance.onerror = () => {
    if (session !== speechSession) return;
    speechState = "idle";
    updateReadAloudButton();
  };
  utterance.onpause = () => {
    if (session !== speechSession) return;
    speechState = "paused";
    updateReadAloudButton();
  };
  utterance.onresume = () => {
    if (session !== speechSession) return;
    speechState = "speaking";
    updateReadAloudButton();
  };

  speechState = "speaking";
  updateReadAloudButton();
  window.speechSynthesis.speak(utterance);
}

function toggleReadAloud() {
  const state = parseHash();
  if (state.view !== "read" || !speechSupported) return;

  if (speechState === "speaking") {
    window.speechSynthesis.pause();
    speechState = "paused";
  } else if (speechState === "paused") {
    window.speechSynthesis.resume();
    speechState = "speaking";
  } else {
    speakChapter(state.book, state.chapter);
    return;
  }
  updateReadAloudButton();
}

function renderRead(book, chapter) {
  const heading = chapter.label ? `${chapter.label} · ${chapter.source}` : `${book.name} ${chapter.n}`;
  titleEl.textContent = chapter.label || heading;
  backBtn.hidden = false;
  backLabel.textContent = book.name;
  backBtn.onclick = () => go(book.id);
  rememberPlace(book, chapter);

  const passage = el("article", { class: "passage" }, el("h2", {}, heading));
  for (const verse of chapter.verses) {
    passage.append(
      el(
        "p",
        { class: "verse" },
        el("sup", { class: "vn" }, String(verse.n)),
        ` ${verse.t}`
      )
    );
  }

  const prev = neighbor(book, chapter, -1);
  const next = neighbor(book, chapter, 1);
  const nav = el(
    "nav",
    { class: "chapter-nav" },
    el(
      "button",
      {
        type: "button",
        class: "nav-btn",
        disabled: !prev,
        onClick: () => prev && go(`${prev.book.id}/${prev.chapter.n}`),
      },
      prev ? `‹ ${prev.chapter.label || `${prev.book.name} ${prev.chapter.n}`}` : "‹ Previous"
    ),
    el(
      "button",
      {
        type: "button",
        class: "nav-btn",
        disabled: !next,
        onClick: () => next && go(`${next.book.id}/${next.chapter.n}`),
      },
      next ? `${next.chapter.label || `${next.book.name} ${next.chapter.n}`} ›` : "Next ›"
    )
  );

  app.replaceChildren(passage, nav);
  window.scrollTo(0, 0);
}

function route() {
  stopSpeech();
  if (!data) return;
  const state = parseHash();
  document.body.classList.toggle("reading", state.view === "read");
  updateReadAloudButton();
  if (state.view === "read") renderRead(state.book, state.chapter);
  else if (state.view === "book") renderBook(state.book);
  else renderHome();
}

function changeFont(delta) {
  const current = settings.fontSize || 1.25;
  settings.fontSize = Math.min(FONT_MAX, Math.max(FONT_MIN, +(current + delta).toFixed(3)));
  saveSettings();
  applySettings();
}

themeBtn.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme;
  settings.theme = nextTheme(current);
  saveSettings();
  applySettings();
});
verseNumbersBtn.addEventListener("click", () => {
  settings.verseNumbers = !verseNumbersVisible();
  saveSettings();
  applySettings();
});
readAloudBtn.addEventListener("click", toggleReadAloud);
fontDownBtn.addEventListener("click", () => changeFont(-FONT_STEP));
fontUpBtn.addEventListener("click", () => changeFont(FONT_STEP));
narrowHeader.addEventListener("change", applySettings);
window.addEventListener("hashchange", route);
window.addEventListener("keydown", (event) => {
  if (!data || event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  const state = parseHash();
  if (state.view !== "read") return;
  const step = event.key === "ArrowLeft" ? -1 : 1;
  const target = neighbor(state.book, state.chapter, step);
  if (target) go(`${target.book.id}/${target.chapter.n}`);
});

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

function isPhone() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

let deferredInstall = null;
let installBanner = null;

function hideInstallBanner() {
  if (!installBanner) return;
  installBanner.remove();
  installBanner = null;
  document.body.classList.remove("offer-install");
}

function showInstallBanner() {
  if (isStandalone() || settings.hideInstall || installBanner || !data) return;
  if (!isPhone() && !deferredInstall) return;

  const installBtn = deferredInstall
    ? el(
        "button",
        {
          type: "button",
          class: "install-go",
          onClick: () => {
            deferredInstall.prompt();
            deferredInstall.userChoice.finally(() => {
              deferredInstall = null;
              hideInstallBanner();
            });
          },
        },
        "Install"
      )
    : null;

  installBanner = el(
    "div",
    { class: "install-banner", role: "status" },
    el(
      "p",
      {},
      deferredInstall
        ? "Install this on your phone. After that it works with the laptop off."
        : "Chrome menu → Add to Home screen. After that it stays on your phone with the laptop off."
    ),
    el(
      "div",
      { class: "install-actions" },
      installBtn,
      el(
        "button",
        {
          type: "button",
          class: "install-dismiss",
          onClick: () => {
            settings.hideInstall = true;
            saveSettings();
            hideInstallBanner();
          },
        },
        "Not now"
      )
    )
  );
  document.body.classList.add("offer-install");
  document.body.append(installBanner);
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstall = event;
  showInstallBanner();
});
window.addEventListener("appinstalled", hideInstallBanner);

function showLanguage(lang) {
  applySettings();
  if (!data) app.replaceChildren(el("p", { class: "status" }, "Loading…"));
  return loadLanguage(lang)
    .then((json) => {
      if (currentLang() !== lang) return;
      data = buildCollections(json);
      route();
      showInstallBanner();
    })
    .catch((error) => {
      app.replaceChildren(el("p", { class: "status" }, error.message));
    });
}

langBtn.addEventListener("click", () => {
  stopSpeech();
  settings.lang = otherLang();
  saveSettings();
  showLanguage(currentLang());
});

showLanguage(currentLang());

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
