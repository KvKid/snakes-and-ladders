import random

SNAKES = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78}
LADDERS = {1: 38, 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91}

PLAYER_SYMBOLS = ["●", "■", "▲", "◆"]

# ANSI colour codes
RED     = "\033[31m"
GREEN   = "\033[32m"
YELLOW  = "\033[33m"
BLUE    = "\033[34m"
MAGENTA = "\033[35m"
CYAN    = "\033[36m"
BOLD    = "\033[1m"
RESET   = "\033[0m"

# One distinct colour per player slot (up to 4 players)
PLAYER_COLOURS = [CYAN, YELLOW, MAGENTA, BLUE]

def roll_dice():
    return random.randint(1, 6)

def move_player(position, roll):
    new_pos = position + roll
    if new_pos > 100:
        return position
    if new_pos in SNAKES:
        print(f"{RED}  Oh no! Snake at {new_pos} sends you to {SNAKES[new_pos]}{RESET}")
        return SNAKES[new_pos]
    if new_pos in LADDERS:
        print(f"{GREEN}  Ladder at {new_pos} takes you up to {LADDERS[new_pos]}!{RESET}")
        return LADDERS[new_pos]
    return new_pos

def draw_board(positions, names):
    # Build a map of square -> list of player symbols (with colour)
    square_players = {}
    for i, name in enumerate(names):
        sq = positions[name]
        if sq > 0:
            colour = PLAYER_COLOURS[i]
            square_players.setdefault(sq, []).append(f"{colour}{PLAYER_SYMBOLS[i]}{RESET}")

    print("\n" + "=" * 55)
    for row in range(9, -1, -1):  # rows 10 down to 1
        # Even rows go left-to-right, odd rows right-to-left (snake pattern)
        squares = range(row * 10 + 1, row * 10 + 11)
        if row % 2 == 1:
            squares = reversed(list(squares))

        line = ""
        for sq in squares:
            cell = ""
            if sq in SNAKES:
                cell = f" {RED}S{RESET} "
            elif sq in LADDERS:
                cell = f" {GREEN}L{RESET} "
            else:
                cell = "   "

            players_here = square_players.get(sq, [])
            if players_here:
                # Join symbols; pad to 3 visible characters (symbols are single chars)
                joined = "".join(players_here)
                padding = " " * (3 - len(players_here))
                cell = f"{joined}{padding}"

            line += f"|{sq:02d}{cell}"
        print(line + "|")
        print("-" * 55)

    # Legend
    print(f"{RED}S{RESET}=Snake  {GREEN}L{RESET}=Ladder  ", end="")
    for i, name in enumerate(names):
        colour = PLAYER_COLOURS[i]
        print(f"{colour}{PLAYER_SYMBOLS[i]}{RESET}={name}  ", end="")
    print()

def game_summary(names, turns, winner):
    print("\n=== Game Summary ===")
    print(f"Winner: {winner} 🎉")
    print(f"{'Player':<15} {'Turns Taken'}")
    print("-" * 28)
    for name in names:
        marker = " ← winner" if name == winner else ""
        print(f"{name:<15} {turns[name]}{marker}")

def play():
    print("=== Snakes and Ladders ===")
    num_players = int(input("How many players? (1-4): "))
    names = [input(f"Player {i+1} name: ") for i in range(num_players)]
    positions = {name: 0 for name in names}
    turns = {name: 0 for name in names}

    draw_board(positions, names)

    while True:
        for name in names:
            input(f"\n{name}'s turn — press Enter to roll...")
            roll = roll_dice()
            print(f"  Rolled a {roll}")
            positions[name] = move_player(positions[name], roll)
            turns[name] += 1
            print(f"  {name} is now on square {positions[name]}")
            draw_board(positions, names)
            if positions[name] == 100:
                print(f"\n{BOLD}{YELLOW}🎉 {name} wins!{RESET}")
                game_summary(names, turns, name)
                return

if __name__ == "__main__":
    play()
