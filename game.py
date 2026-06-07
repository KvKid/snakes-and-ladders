import random

SNAKES = {16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78}
LADDERS = {1: 38, 4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91}

def roll_dice():
    return random.randint(1, 6)

def move_player(position, roll):
    new_pos = position + roll
    if new_pos > 100:
        return position  # can't go past 100
    if new_pos in SNAKES:
        print(f"  Oh no! Snake at {new_pos} sends you to {SNAKES[new_pos]}")
        return SNAKES[new_pos]
    if new_pos in LADDERS:
        print(f"  Ladder at {new_pos} takes you up to {LADDERS[new_pos]}!")
        return LADDERS[new_pos]
    return new_pos

def play():
    print("=== Snakes and Ladders ===")
    num_players = int(input("How many players? (1-4): "))
    names = [input(f"Player {i+1} name: ") for i in range(num_players)]
    positions = {name: 0 for name in names}

    while True:
        for name in names:
            input(f"\n{name}'s turn — press Enter to roll...")
            roll = roll_dice()
            print(f"  Rolled a {roll}")
            positions[name] = move_player(positions[name], roll)
            print(f"  {name} is now on square {positions[name]}")
            if positions[name] == 100:
                print(f"\n🎉 {name} wins!")
                return

if __name__ == "__main__":
    play()
