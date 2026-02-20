export const PAYVEX_PLANS = {
  STANDARD: {
    name: 'Standard',
    price: 349.9,
    gatewaysLimit: 3,
    usersLimit: 5,
    transactionsLimit: 1500,
    hasAiAnalyst: false,
    multiAppLimit: 1,
    prioritySupport: false,
  },
  PRO: {
    name: 'Pro',
    price: 499.9,
    gatewaysLimit: 10,
    usersLimit: 15,
    transactionsLimit: 10000,
    hasAiAnalyst: false,
    multiAppLimit: 5,
    prioritySupport: true,
  },
  EXPERT_AI: {
    name: 'Expert AI',
    price: 2500.0,
    gatewaysLimit: 20,
    usersLimit: 99,
    transactionsLimit: 1000000, // Praticamente ilimitado
    hasAiAnalyst: true,
    multiAppLimit: 10,
    prioritySupport: true,
  },
};
