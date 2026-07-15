import json

# This script creates items.json inside albion-flipper/src/ so the Vite server can import it.
def create_mock():
    # Incase it's completely missing, this acts as fallback structure
    # to stop Vite from crashing while the user re-fetches items.
    output_data = {
        "equipment": ["T4_HEAD_CLOTH_SET1", "T4_ARMOR_CLOTH_SET1"],
        "materials": ["T4_RUNE", "T4_SOUL", "T4_RELIC"]
    }
    with open("albion-flipper/src/items.json", "w") as f:
        json.dump(output_data, f, indent=2)

try:
    with open("items.json", "r") as f:
        items = json.load(f)

    equipment_ids = []
    upgrade_materials = []

    Tiers = ["T4", "T5", "T6", "T7", "T8"]
    materials_suffix = ["_RUNE", "_SOUL", "_RELIC"]
    parts = ["HEAD", "ARMOR", "SHOES", "MAIN", "2H", "OFF", "CAPE", "BAG"]

    for item in items:
        unique_name = item.get("UniqueName", "")
        if any(unique_name == tier + suffix for tier in Tiers for suffix in materials_suffix):
            upgrade_materials.append(unique_name)
            continue
        if any(unique_name.startswith(tier + "_") for tier in Tiers):
            if any(part in unique_name for part in parts):
                 if "NONTRADABLE" not in unique_name and "ARENA" not in unique_name and "ROYAL" not in unique_name and "UNDEAD" not in unique_name:
                     equipment_ids.append(unique_name)

    output_data = {
        "equipment": equipment_ids,
        "materials": upgrade_materials
    }

    with open("albion-flipper/src/items.json", "w") as f:
        json.dump(output_data, f, indent=2)
except FileNotFoundError:
    print("Items file not found, creating dummy...")
    create_mock()
