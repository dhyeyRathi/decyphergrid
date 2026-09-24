# Multiplayer Word Deduction Game — Full Development Specification

## 1. PROJECT OBJECTIVE

Build a real-time multiplayer browser game for team word deduction, with its own branding, UI, word database, room system, and implementation.

The game is a two-team word deduction game.

Players are divided into:

- RED team
- BLUE team

Each team has:

- 1 Spymaster
- 1 or more Operatives

The game uses a 5×5 grid containing 25 randomly selected words.

The Spymasters know the hidden identity of every card.

The Operatives only see the words and must infer which words belong to their team based on the Spymaster's one-word clue.

---

# 2. TECHNOLOGY REQUIREMENTS

Use the following architecture unless there is a strong technical reason not to.

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- App Router

### Realtime

Use WebSockets / Socket.IO for live multiplayer communication.

The game must NOT rely on polling.

All important game interactions must be synchronized through the socket connection.

### Persistence

There is intentionally NO database.

Do not introduce:

- PostgreSQL
- Supabase database
- MongoDB
- Firebase
- Redis persistence
- MySQL
- SQLite

Game rooms exist only in server memory.

When the server restarts, all active rooms and games are destroyed.

This is intentional.

---

# 3. USER IDENTITY

The application does not require accounts or authentication.

When a user opens the website, check whether a browser cookie containing their player name exists.

Cookie:

```text
player_name
```

### First visit

If the cookie does not exist:

1. Display a name-entry screen.
2. Ask the user to enter a display name.
3. Validate the name.
4. Store it in a cookie.
5. Cookie lifetime must be 30 days.
6. Continue to the main game screen.

### Returning user

If:

```text
player_name
```

exists and has not expired:

- Do not ask for the name again.
- Use the stored name automatically.

### Important

The name cookie is only for convenience.

It is NOT authentication.

A user can change their name by clearing the cookie or using an appropriate "Change Name" option.

Do not store game state in the cookie.

Do not store secret card identities in the cookie.

---

# 4. WORD DATASET

The application must contain approximately 3,000 unique English words.

These words must be:

- Commonly understood
- Meaningful
- Single words
- Suitable for a word-association game
- Appropriate for general audiences

Do NOT generate random nonsense words.

Do NOT use phrases containing multiple words.

Do NOT use obscure technical vocabulary excessively.

Do NOT use offensive, explicit, hateful, or inappropriate words.

Examples of acceptable word categories:

### Animals

```text
Dog
Cat
Horse
Tiger
Lion
Eagle
Shark
Whale
Rabbit
Snake
```

### Places

```text
Paris
London
School
Airport
Beach
Garden
Castle
Island
Park
Hotel
```

### Things

```text
Phone
Chair
Table
Bottle
Clock
Book
Camera
Bridge
Car
House
```

### Food

```text
Apple
Pizza
Bread
Rice
Cake
Coffee
Banana
Cheese
```

### Games / entertainment

```text
Chess
Football
Cricket
Tennis
Puzzle
Movie
Music
Card
```

### Festivals / celebrations

```text
Christmas
Diwali
Halloween
Easter
Birthday
Wedding
Festival
Parade
```

### Nature

```text
River
Mountain
Forest
Rain
Snow
Cloud
Fire
Ocean
Tree
Flower
```

### People / relationships

```text
Friend
Doctor
Teacher
Parent
Child
King
Queen
Leader
Player
```

### General concepts

```text
Love
Time
Money
Power
Dream
Hope
Luck
Freedom
Truth
Secret
```

The dataset should contain many categories rather than being dominated by one category.

Store the words in a dedicated data module/file.

Example:

```ts
export const WORD_POOL = [
  "Apple",
  "Bridge",
  "Tiger",
  "Castle",
  ...
];
```

Ensure there are no duplicate words.

---

# 5. GAME BOARD

Every game generates a completely new board.

The board consists of:

```text
5 × 5 = 25 cards
```

When a room/game starts:

1. Randomly select 25 unique words from the 3,000-word pool.
2. Shuffle them.
3. Assign each card a secret team identity.

Example:

```text
┌────────┬────────┬────────┬────────┬────────┐
│ APPLE  │ TIGER  │ MOON   │ CASTLE │ PHONE  │
├────────┼────────┼────────┼────────┼────────┤
│ RIVER  │ CHESS  │ HORSE  │ CLOUD  │ PIZZA  │
├────────┼────────┼────────┼────────┼────────┤
│ SCHOOL │ EAGLE  │ BRIDGE │ MUSIC  │ GOLD   │
├────────┼────────┼────────┼────────┼────────┤
│ BEACH  │ ROBOT  │ TREE   │ CROWN  │ TRAIN  │
├────────┼────────┼────────┼────────┼────────┤
│ HOUSE  │ SPACE  │ DOG    │ RING   │ CAKE   │
└────────┴────────┴────────┴────────┴────────┘
```

---

# 6. CARD IDENTITIES

Each card has exactly one hidden identity.

Possible identities:

```ts
type CardType =
  | "RED"
  | "BLUE"
  | "NEUTRAL"
  | "ASSASSIN";
```

Distribution:

```text
RED       = 9
BLUE      = 8
NEUTRAL   = 7
ASSASSIN  = 1
TOTAL     = 25
```

The RED team is always the starting team.

Therefore:

```text
RED = 9 words
BLUE = 8 words
```

The game does not randomly choose which team starts.

RED always starts.

---

# 7. SECRET INFORMATION

The server must maintain the complete board state.

Example internal representation:

```ts
{
  id: "card-01",
  word: "APPLE",
  type: "RED",
  revealed: false
}
```

However, secret information must NEVER be sent to Operatives.

### Spymaster receives

```text
APPLE → RED
MOON → BLUE
DOG → NEUTRAL
GOLD → ASSASSIN
```

### Operative receives

```text
APPLE
MOON
DOG
GOLD
```

The Operative must not be able to inspect:

- card type
- unrevealed team
- assassin identity
- opponent card identity

through normal API/socket responses.

The server must be authoritative.

Do not trust the client.

---

# 8. ROOM SYSTEM

There is no permanent lobby.

Every room is created fresh.

A user can:

### Create Room

The user clicks:

```text
Create Game
```

The server creates:

- unique room code
- room admin
- empty player list
- game state

Example:

```text
Room Code: X7K92P
```

The room should have a shareable URL such as:

```text
/game/X7K92P
```

or an equivalent route.

---

# 9. ROOM ADMIN

The person who creates the room becomes:

```text
Room Admin
```

The admin can:

- Start the game
- Manage the lobby
- See all connected players
- Assign teams
- Assign roles
- Remove players if implemented
- Restart the game

The admin is NOT automatically required to be:

- RED
- BLUE
- Spymaster

The admin is simply the room owner.

---

# 10. JOINING A ROOM

A user can join using the room code.

Example:

```text
Enter Room Code:
[ X7K92P ]

[ JOIN GAME ]
```

The server validates:

1. Room exists.
2. Game has not already finished/started in a way that prevents joining.
3. Player is allowed to join.
4. Name is available within the room.

If valid:

```text
JOIN ROOM
    ↓
CREATE PLAYER
    ↓
ADD TO ROOM
    ↓
BROADCAST PLAYER_JOINED
```

All connected players should immediately see the new player.

---

# 11. ROOM LIFETIME

Rooms are temporary.

Do NOT persist rooms to a database.

Room state exists in server memory.

Example:

```ts
const rooms = new Map<string, Room>();
```

When the room is empty, it may be removed from memory.

When the server restarts:

```text
ALL ROOMS ARE DESTROYED
ALL GAMES ARE DESTROYED
```

This is expected behavior.

---

# 12. TEAM STRUCTURE

There are two teams:

```text
RED
BLUE
```

Each team should have:

```text
1 Spymaster
1+ Operatives
```

A player cannot simultaneously be:

- RED and BLUE
- Spymaster and Operative

Each player has:

```ts
{
  id: string;
  name: string;
  team: "RED" | "BLUE" | null;
  role: "SPYMASTER" | "OPERATIVE" | null;
}
```

---

# 13. MINIMUM PLAYERS

The game should require at least:

```text
4 players
```

Recommended minimum:

```text
RED
- 1 Spymaster
- 1 Operative

BLUE
- 1 Spymaster
- 1 Operative
```

The admin cannot start the game until both teams have:

```text
1 Spymaster
1 Operative
```

Additional players become Operatives.

---

# 14. GAME START

When the admin clicks:

```text
START GAME
```

the server validates:

- Minimum players exist.
- Both teams have a Spymaster.
- Both teams have at least one Operative.
- No invalid role assignments exist.

Then the server:

1. Selects 25 random words.
2. Creates the board.
3. Assigns 9 RED cards.
4. Assigns 8 BLUE cards.
5. Assigns 7 NEUTRAL cards.
6. Assigns 1 ASSASSIN.
7. Shuffles the cards.
8. Sets current team to RED.
9. Sets game status to PLAYING.
10. Broadcasts the appropriate state to every player.

---

# 15. GAME TURN

RED always starts.

The turn has two primary stages:

```text
CLUE
↓
GUESSING
```

---

# 16. SPYMASTER CLUE

When it is RED's turn:

Only the RED Spymaster can submit a clue.

The clue must contain:

```text
ONE WORD
+
NUMBER
```

Example:

```text
Animal 3
```

The Spymaster may only give **one word as the clue**.

Do not allow:

```text
"Big animal"
"Animal related to Africa"
"Think about something furry"
```

Only:

```text
Lion
Animal
Ocean
Space
Music
```

etc.

The number indicates the number of intended related cards.

---

# 17. CLUE SUBMISSION

Client sends:

```ts
socket.emit("submit_clue", {
  roomCode,
  clue: "Animal",
  number: 3
});
```

Server validates:

- Player exists.
- Player is the current team's Spymaster.
- Game is active.
- Game is in CLUE phase.
- Clue contains exactly one word.
- Number is valid.

Then server updates:

```ts
currentClue = {
  word: "Animal",
  number: 3
};
```

Game moves to:

```text
GUESSING
```

All players see:

```text
CLUE: ANIMAL — 3
```

---

# 18. OPERATIVE GUESSING

Only Operatives from the current team may select cards.

Example:

```text
socket.emit("select_card", {
  roomCode,
  cardId
});
```

The server validates:

- Game is active.
- It is the correct team's turn.
- Player is an Operative.
- Card exists.
- Card has not already been revealed.
- Game is currently in GUESSING phase.

---

# 19. CARD RESULT

After a card is selected, the server determines its hidden type.

### Own card

```text
RED selects RED
```

Result:

```text
Card revealed
Team continues guessing
```

### Opponent card

```text
RED selects BLUE
```

Result:

```text
Card revealed
RED turn ends
BLUE turn begins
```

### Neutral card

```text
RED selects NEUTRAL
```

Result:

```text
Card revealed
RED turn ends
BLUE turn begins
```

### Assassin

```text
RED selects ASSASSIN
```

Result:

```text
Game immediately ends
BLUE wins
```

---

# 20. GUESS LIMIT

The team starts with the clue number as its intended number of guesses.

Example:

```text
Animal — 3
```

The team may attempt up to:

```text
3 normal guesses
```

and may make the additional guess permitted by the game's rules.

The team may voluntarily end its turn at any point.

Provide an:

```text
END TURN
```

button.

---

# 21. WIN CONDITIONS

After every card reveal, check victory.

### RED wins

If:

```text
All 9 RED cards are revealed
```

### BLUE wins

If:

```text
All 8 BLUE cards are revealed
```

### Assassin

If either team reveals:

```text
ASSASSIN
```

that team loses immediately.

The other team wins.

---

# 22. TURN TRANSITION

When a turn ends:

```text
CURRENT TEAM
      ↓
OTHER TEAM
      ↓
RESET CLUE
      ↓
RESET GUESS COUNT
      ↓
CLUE PHASE
```

Example:

```text
RED
 ↓
RED gives clue
 ↓
RED guesses
 ↓
RED hits BLUE
 ↓
RED turn ends
 ↓
BLUE
 ↓
BLUE gives clue
```

---

# 23. REAL-TIME SOCKET EVENTS

Implement a clear socket event architecture.

Suggested events:

### Room

```text
CREATE_ROOM
JOIN_ROOM
LEAVE_ROOM
PLAYER_JOINED
PLAYER_LEFT
ROOM_STATE
```

### Lobby

```text
SET_TEAM
SET_ROLE
START_GAME
```

### Gameplay

```text
SUBMIT_CLUE
CLUE_SUBMITTED

SELECT_CARD
CARD_REVEALED

END_TURN
TURN_CHANGED

GAME_WON
GAME_LOST
GAME_OVER
```

### Connection

```text
PLAYER_CONNECTED
PLAYER_DISCONNECTED
PLAYER_RECONNECTED
```

Use server-generated events to synchronize all clients.

---

# 24. SERVER AUTHORITY

The server is the single source of truth.

Never allow the client to determine:

```text
Card type
Winner
Current team
Current phase
Valid guess
Valid role
Valid clue
Number of remaining agents
```

For example, NEVER implement:

```ts
if (card.type === "RED") {
  // client decides the result
}
```

Instead:

```text
Client:
"I selected card ABC"

       ↓

Server:
"What is card ABC?"

       ↓

Server:
"ABC is RED"

       ↓

Server:
Update game state

       ↓

Broadcast result
```

---

# 25. CLIENT STATE

The frontend should maintain only the information required for rendering.

Examples:

```ts
gameStatus
currentTeam
currentClue
players
board
revealedCards
winner
```

Do not place the hidden answer key into React state for Operatives.

---

# 26. DISCONNECT / RECONNECT

If a player disconnects:

- Remove them from active socket connections.
- Keep their player record temporarily.
- Broadcast disconnected status.
- Allow reconnection.

When they reconnect:

```text
Reconnect
↓
Identify player
↓
Restore room membership
↓
Send current authorized game state
```

Do not expose hidden information during reconnection.

---

# 27. NAME COOKIE

Cookie specification:

```text
Name: player_name
Value: user's chosen name
Max-Age: 30 days
```

The cookie should be:

```text
Max-Age = 2592000
```

Do not store:

- room code
- team
- role
- game state
- secret board
- authentication credentials

in the name cookie.

---

# 28. UI PAGES

The application should have a simple flow.

### `/`

Name screen if no cookie exists.

Otherwise:

```text
Create Game
Join Game
```

### `/game/[roomCode]`

Game room.

Before starting:

```text
Lobby
```

After starting:

```text
Game Board
```

After completion:

```text
Game Over
```

---

# 29. LOBBY UI

Display:

```text
ROOM CODE

RED TEAM
[ players ]

BLUE TEAM
[ players ]

UNASSIGNED
[ players ]

[ START GAME ]
```

Admin controls:

```text
Start Game
```

Players can choose:

```text
Team
Role
```

or the admin can manage assignments.

---

# 30. GAME UI

### Header

Display:

```text
Room Code
Current Team
Game Status
```

### Board

Display:

```text
5 × 5 cards
```

Each card should support:

- Hover state
- Selection
- Revealed state
- Team color
- Assassin state
- Disabled state

### Clue area

Display:

```text
CLUE
Animal

NUMBER
3
```

### Team status

Display:

```text
RED
7 / 9

BLUE
5 / 8
```

---

# 31. SPYMASTER UI

Spymaster cards should visually display their hidden identity.

Example:

```text
APPLE    🔴
MOON     🔵
DOG      ⚪
GOLD     ☠️
```

The Spymaster can:

```text
Enter clue
Enter number
Submit clue
```

Once submitted, the Spymaster cannot change the clue.

---

# 32. OPERATIVE UI

Operatives should see:

```text
APPLE
MOON
DOG
GOLD
```

without hidden identities.

When a card is revealed:

```text
APPLE → RED
```

the card receives its appropriate revealed styling.

Operatives cannot submit clues.

---

# 33. GAME RESET

Because rooms are temporary, restarting should create a completely new game state.

When:

```text
PLAY AGAIN
```

is selected:

- Generate a new 25-word board.
- Generate new card identities.
- Reset revealed cards.
- Reset turn.
- Reset clue.
- Reset winner.
- Keep the same room.
- Keep the same players.

Do NOT reuse the previous board.

---

# 34. RANDOMIZATION REQUIREMENTS

Every new game must independently randomize:

1. The 25 selected words.
2. Their positions in the grid.
3. The positions of RED cards.
4. The positions of BLUE cards.
5. The positions of NEUTRAL cards.
6. The position of the ASSASSIN.

Do not use a predictable sequence.

Use a proper server-side randomization method.

---

# 35. DATA STRUCTURES

Use strongly typed TypeScript structures.

Example:

```ts
type Team = "RED" | "BLUE";

type Role = "SPYMASTER" | "OPERATIVE";

type CardType =
  | "RED"
  | "BLUE"
  | "NEUTRAL"
  | "ASSASSIN";

type GamePhase =
  | "LOBBY"
  | "CLUE"
  | "GUESSING"
  | "FINISHED";
```

Player:

```ts
interface Player {
  id: string;
  name: string;
  team: Team | null;
  role: Role | null;
  connected: boolean;
}
```

Card:

```ts
interface Card {
  id: string;
  word: string;
  type: CardType;
  revealed: boolean;
}
```

Clue:

```ts
interface Clue {
  word: string;
  number: number;
}
```

Room:

```ts
interface Room {
  code: string;
  adminId: string;
  players: Player[];
  game: GameState | null;
}
```

---

# 36. IMPORTANT SECURITY REQUIREMENT

Because there is no database and the game is real-time, the server must maintain all authoritative state in memory.

Never send the full `GameState` to every client.

Instead create separate state serializers:

```text
getSpymasterGameState()
getOperativeGameState()
```

For example:

```ts
getSpymasterGameState(room)
```

can include:

```text
card.type
```

while:

```ts
getOperativeGameState(room)
```

must omit:

```text
card.type
```

for unrevealed cards.

This is mandatory.

---

# 37. DEVELOPMENT PRIORITY

Build in this order:

### Phase 1 — Foundation

- Next.js project
- TypeScript
- Tailwind
- Basic pages
- Name cookie

### Phase 2 — Room System

- Create room
- Generate room code
- Join room
- In-memory room manager

### Phase 3 — Socket System

- Socket server
- Connect/disconnect
- Player synchronization
- Room synchronization

### Phase 4 — Lobby

- Players
- Teams
- Roles
- Admin
- Start game

### Phase 5 — Game Engine

- 3,000-word dataset
- Random board generation
- Secret card assignment
- Turn management
- Clue system
- Guess system
- Win/loss logic

### Phase 6 — Game UI

- 5×5 board
- Spymaster view
- Operative view
- Revealed cards
- Turn indicators
- Team progress

### Phase 7 — Reliability

- Reconnection
- Invalid-action handling
- Simultaneous action protection
- Room cleanup
- Game reset

### Phase 8 — Polish

- Animations
- Responsive design
- Loading states
- Error states
- Empty states
- Sound effects if desired
- Better visual feedback

---

# 38. FINAL IMPLEMENTATION RULE

Do not create a mockup that only visually resembles the game.

The result must be a FUNCTIONAL multiplayer game.

The following must actually work between separate browser windows/devices:

```text
Browser A
    ↓
Create Room
    ↓
Browser B
    ↓
Join Room
    ↓
Both see each other
    ↓
Teams/roles synchronize
    ↓
Admin starts game
    ↓
Server generates board
    ↓
Spymasters see secret identities
    ↓
Operatives do NOT see secret identities
    ↓
Spymaster submits clue
    ↓
All players see clue
    ↓
Operative selects card
    ↓
Server validates selection
    ↓
All players see result
    ↓
Turn changes when required
    ↓
Game continues
    ↓
Winner is determined by server
    ↓
All players see final result
```

Build the game around **server-authoritative state + real-time socket synchronization + temporary in-memory rooms**.

Do not add a database or authentication system unless explicitly requested later.
i have already created the proejct called decyphergrid. that will be the name of project