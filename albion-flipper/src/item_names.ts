export const formatItemName = (uniqueName: string) => {
  // A simple function to format the item name from its UniqueName
  // e.g., T4_HEAD_CLOTH_SET1 -> T4 Scholar Cowl
  let name = uniqueName.replace(/_/g, " ");
  // Normally you'd want localized names, but for personal use, a clean internal name works or mapping.
  return name;
};
