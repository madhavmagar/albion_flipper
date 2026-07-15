import json
try:
    with open("items.json", "r") as f:
        items = json.load(f)
except FileNotFoundError:
    print("Items file not found.")
    exit(1)

equipment_ids = []
upgrade_materials = []

Tiers = ["T4", "T5", "T6", "T7", "T8"]
materials_suffix = ["_RUNE", "_SOUL", "_RELIC"]
# Categories that indicate equippables
parts = ["HEAD", "ARMOR", "SHOES", "MAIN", "2H", "OFF", "CAPE", "BAG"]

for item in items:
    unique_name = item.get("UniqueName", "")

    # Check for upgrade materials
    if any(unique_name == tier + suffix for tier in Tiers for suffix in materials_suffix):
        upgrade_materials.append(unique_name)
        continue

    # Standard item matching
    if any(unique_name.startswith(tier + "_") for tier in Tiers):
        if any(part in unique_name for part in parts):
             # Skip untradable / arena items
             if "NONTRADABLE" not in unique_name and "ARENA" not in unique_name and "ROYAL" not in unique_name and "UNDEAD" not in unique_name:
                 equipment_ids.append(unique_name)

print(f"Found {len(equipment_ids)} equipment items.")
print(f"Found {len(upgrade_materials)} upgrade materials.")

output_data = {
    "equipment": equipment_ids,
    "materials": upgrade_materials
}

with open("albion-flipper/src/items.json", "w") as f:
    json.dump(output_data, f, indent=2)
