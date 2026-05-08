/**
 * Normalise an ID that may be a raw string/ObjectId or a populated Mongoose document.
 */
const normalizeId = (value) => {
  if (!value) return null;
  return value._id ? String(value._id) : String(value);
};

/**
 * Compute the net balance for each group member.
 * Positive balance → member should receive money
 * Negative balance → member owes money
 */
export const computeGroupBalances = (memberIds, expenses = [], settlements = []) => {
  const balances = {};

  // Initialise all members to 0
  for (const id of memberIds) {
    balances[String(id)] = 0;
  }

  // Process expenses
  for (const expense of expenses) {
    const paidBy = normalizeId(expense.paidBy);
    const amount = Number(expense.amount);
    const participants = (expense.participants || []).map(normalizeId).filter(Boolean);

    if (!paidBy || !participants.length) continue;

    const share = amount / participants.length;

    // Payer gets credit for the full amount
    if (balances[paidBy] !== undefined) {
      balances[paidBy] = Math.round((balances[paidBy] + amount) * 100) / 100;
    }

    // Each participant owes their share
    for (const p of participants) {
      if (balances[p] !== undefined) {
        balances[p] = Math.round((balances[p] - share) * 100) / 100;
      }
    }
  }

  // Process settlements
  for (const s of settlements) {
    const from = normalizeId(s.fromUser);
    const to = normalizeId(s.toUser);
    const amount = Number(s.amount);

    if (!from || !to) continue;

    // fromUser already paid off some debt
    if (balances[from] !== undefined) {
      balances[from] = Math.round((balances[from] + amount) * 100) / 100;
    }
    if (balances[to] !== undefined) {
      balances[to] = Math.round((balances[to] - amount) * 100) / 100;
    }
  }

  // Ignore values below ₹0.01
  for (const id of Object.keys(balances)) {
    if (Math.abs(balances[id]) < 0.01) {
      balances[id] = 0;
    }
  }

  return balances;
};

/*
   Determine the minimum number of transactions to settle all balances.
 */
export const computeMinimalSettlements = (balances) => {
  const creditors = []; // positive balance — should receive
  const debtors = [];   // negative balance — should pay

  for (const [id, bal] of Object.entries(balances)) {
    if (bal > 0.01) creditors.push({ id, amount: bal });
    else if (bal < -0.01) debtors.push({ id, amount: -bal }); // store as positive
  }

  // Sort descending for greedy matching
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const settlements = [];
  let i = 0; let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const transfer = Math.min(debtor.amount, creditor.amount);
    const rounded = Math.round(transfer * 100) / 100;

    if (rounded >= 0.01) {
      settlements.push({ from: debtor.id, to: creditor.id, amount: rounded });
    }

    debtor.amount = Math.round((debtor.amount - transfer) * 100) / 100;
    creditor.amount = Math.round((creditor.amount - transfer) * 100) / 100;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return settlements;
};

/*
 Full pipeline: compute balances then minimise transactions.
 */
export const settlementEngine = (memberIds, expenses = [], settlements = []) => {
  const balances = computeGroupBalances(memberIds, expenses, settlements);
  return computeMinimalSettlements(balances);
};
