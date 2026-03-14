export interface Exercise {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ContentBlock {
  type: 'text' | 'exercise';
  text?: string;
  exercise?: Exercise;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  blocks: ContentBlock[];
}

export const lessons: Lesson[] = [
  {
    id: 'card-basics',
    title: 'Card Basics',
    description: 'Suits, ranks, and suit ranking',
    blocks: [
      { type: 'text', text: 'A standard deck has 52 cards in 4 suits: Clubs ♣, Diamonds ♦, Hearts ♥, and Spades ♠. Each suit has 13 cards ranked from 2 (lowest) to Ace (highest).' },
      { type: 'text', text: 'In Bridge, suits are ranked: Clubs (lowest) < Diamonds < Hearts < Spades (highest). Hearts and Spades are called "major suits" because they score more points. Clubs and Diamonds are "minor suits."' },
      { type: 'exercise', exercise: { question: 'Which suit ranks higher?', options: ['Hearts ♥', 'Diamonds ♦'], correctIndex: 0, explanation: 'Hearts ranks higher than Diamonds. The order is: Clubs < Diamonds < Hearts < Spades.' } },
      { type: 'exercise', exercise: { question: 'Which card wins: King of Spades or Ace of Spades?', options: ['King ♠', 'Ace ♠'], correctIndex: 1, explanation: 'The Ace is the highest rank and always beats the King within the same suit.' } },
      { type: 'exercise', exercise: { question: 'Which are the "major suits"?', options: ['Clubs and Diamonds', 'Hearts and Spades', 'Diamonds and Hearts'], correctIndex: 1, explanation: 'Hearts and Spades are the major suits — they score more points when played as trump.' } },
    ],
  },
  {
    id: 'tricks',
    title: 'Tricks',
    description: 'What is a trick, follow-suit, and who wins',
    blocks: [
      { type: 'text', text: 'A trick is one round of play where each player plays one card (4 cards total). The first player to play "leads" the trick and chooses which suit to play.' },
      { type: 'text', text: 'You must follow suit — if a heart is led, you must play a heart if you have one. If you have no cards in the led suit, you may play any card. The highest card of the led suit wins the trick.' },
      { type: 'exercise', exercise: { question: 'Hearts are led. You have: A♠ K♥ 3♦ 7♣. What must you play?', options: ['Ace of Spades', 'King of Hearts', 'Any card you want'], correctIndex: 1, explanation: 'You must follow suit! Since hearts were led and you have the King of Hearts, you must play it.' } },
      { type: 'exercise', exercise: { question: 'Spades are led. The cards played are: 5♠, 10♠, K♠, 3♠. Who wins?', options: ['Player who played 5♠', 'Player who played K♠', 'Player who played 10♠'], correctIndex: 1, explanation: 'The King of Spades is the highest card of the led suit, so that player wins the trick.' } },
    ],
  },
  {
    id: 'trump',
    title: 'Trump',
    description: 'Trump suit, ruffing, and how trump beats everything',
    blocks: [
      { type: 'text', text: 'In Bridge, a "trump suit" is chosen during the bidding. Trump cards beat any card from another suit, regardless of rank. Playing a trump when you can\'t follow suit is called "ruffing."' },
      { type: 'text', text: 'Example: If hearts are trump and spades are led, a 2♥ beats the A♠! But you can only ruff if you have no spades. If you have spades, you must follow suit.' },
      { type: 'exercise', exercise: { question: 'Hearts are trump. Spades are led. Cards: A♠, 2♥, K♠, Q♠. Who wins?', options: ['Ace of Spades', '2 of Hearts (trump)', 'King of Spades'], correctIndex: 1, explanation: 'The 2 of Hearts wins! Any trump card beats any non-trump card, no matter the rank.' } },
      { type: 'exercise', exercise: { question: 'Can you ruff (play trump) if you still have cards in the led suit?', options: ['Yes, anytime', 'No, you must follow suit first'], correctIndex: 1, explanation: 'You must follow suit if you can. You can only ruff when you have no cards in the led suit.' } },
    ],
  },
  {
    id: 'counting-points',
    title: 'Counting Points',
    description: 'High card points and distribution points',
    blocks: [
      { type: 'text', text: 'In Bridge, you evaluate your hand using High Card Points (HCP): Ace = 4, King = 3, Queen = 2, Jack = 1. A deck has 40 total HCP. An "average" hand has 10 HCP.' },
      { type: 'text', text: 'Distribution points add value for short suits: void (0 cards) = 3 points, singleton (1 card) = 2 points, doubleton (2 cards) = 1 point. These help when playing with a trump suit.' },
      { type: 'exercise', exercise: { question: 'How many HCP: A♠ K♥ Q♦ J♣ 7♠ 5♥ 3♦ 9♣ 2♠ 8♥ 4♦ 6♣ 10♠?', options: ['8', '10', '12'], correctIndex: 1, explanation: 'Ace(4) + King(3) + Queen(2) + Jack(1) = 10 HCP.' } },
      { type: 'exercise', exercise: { question: 'You have 5 spades, 4 hearts, 3 diamonds, 1 club. How many distribution points?', options: ['1', '2', '3'], correctIndex: 1, explanation: 'Singleton club = 2 distribution points. The other suits are long enough to not add distribution points.' } },
    ],
  },
  {
    id: 'opening-bids',
    title: 'Opening Bids',
    description: 'When and what to bid to start the auction',
    blocks: [
      { type: 'text', text: 'To open the bidding (be the first to bid something other than Pass), you generally need 12+ HCP. With a balanced hand (no voids, no singletons, at most one doubleton) and 15-17 HCP, open 1NT.' },
      { type: 'text', text: 'With 12+ HCP and an unbalanced hand, open 1 of your longest suit. With two 5-card suits, bid the higher-ranking one first. With 22+ HCP, open 2♣ (a special strong bid).' },
      { type: 'exercise', exercise: { question: 'You have 16 HCP and a balanced hand. What do you open?', options: ['1♠', '1NT', 'Pass'], correctIndex: 1, explanation: '15-17 HCP with a balanced hand = open 1NT. This describes your hand precisely to partner.' } },
      { type: 'exercise', exercise: { question: 'You have 13 HCP with 5 hearts and 3 of every other suit. What do you open?', options: ['1♥', '1NT', 'Pass'], correctIndex: 0, explanation: 'With 13 HCP and a 5-card heart suit, open 1♥. You need 15-17 for 1NT, and your hand isn\'t balanced enough anyway.' } },
      { type: 'exercise', exercise: { question: 'You have 9 HCP. What do you do?', options: ['Open 1♣', 'Open 1NT', 'Pass'], correctIndex: 2, explanation: 'With only 9 HCP, you don\'t have enough to open. Pass and wait to see what partner bids.' } },
    ],
  },
];
