import random

SNAKES = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78}
LADDERS = {1: 38, 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91}

PLAYER_SYMBOLS = ["●", "■", "▲", "◆"]

def roll_dice():
    return random.randint(1, 6)

def move_player(position, roll):
    new_pos = position + roll
    if new_pos > 100:
        return position
    if new_pos in SNAKES:
        print(f"  Oh no! Snake at {new_pos} sends you to {SNAKES[new_pos]}")
        return SNAKES[new_pos]
    if new_pos in LADDERS:
        print(f"  Ladder at {new_pos} takes you up to {LADDERS[new_pos]}!")
        return LADDERS[new_pos]
    return new_pos

def draw_board(positions, names):
    # Build a map of square -> list of player symbols
    square_players = {}
    for i, name in enumerate(names):
        sq = positions[name]
        if sq > 0:
            square_players.setdefault(sq, []).append(PLAYER_SYMBOLS[i])

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
                cell = " S "
            elif sq in LADDERS:
                cell = " L "
            else:
                cell = "   "

            players_here = square_players.get(sq, [])
            if players_here:
                cell = f"{''.join(players_here):<3}"

            line += f"|{sq:02d}{cell}"
        print(line + "|")
        print("-" * 55)

    # Legend
    print("S=Snake  L=Ladder  ", end="")
    for i, name in enumerate(names):
        print(f"{PLAYER_SYMBOLS[i]}={name}  ", end="")
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
                print(f"\n🎉 {name} wins!")
                game_summary(names, turns, name)
                return

if __name__ == "__main__":
    play()
