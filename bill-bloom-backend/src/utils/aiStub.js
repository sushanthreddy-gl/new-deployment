export async function suggestCategory(description) {
  if (!description) return 'Misc';
  const text = description.toLowerCase();
  if (text.match(/\b(food|pizza|burger|restaurant|cafe|dinner|lunch|breakfast|coffee|snack)\b/)) return 'Food';
  if (text.match(/\b(uber|taxi|cab|flight|bus|train|airport|travel|transport|auto|metro)\b/)) return 'Travel';
  if (text.match(/\b(grocery|supermarket|vegetables|fruits|milk|rice)\b/)) return 'Grocery';
  if (text.match(/\b(rent|apartment|house|flat|pg|hostel)\b/)) return 'Rent';
  if (text.match(/\b(medicine|hospital|doctor|pharmacy|health|clinic)\b/)) return 'Healthcare';
  if (text.match(/\b(movie|netflix|game|entertainment|concert|party)\b/)) return 'Entertainment';
  if (text.match(/\b(electricity|water|wifi|internet|phone|bill|utilities)\b/)) return 'Utilities';
  if (text.match(/\b(clothes|shopping|amazon|flipkart|shoes|mall)\b/)) return 'Shopping';
  if (text.match(/\b(school|college|course|book|education|tuition)\b/)) return 'Education';
  return 'Misc';
}

export default suggestCategory;
