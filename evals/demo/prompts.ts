export const demoPrompts: readonly { label: string; message: string }[] = [
  {
    label: "Launch to all customers",
    message: "We want to release our new bulk payment-matching feature to all customers next month. Our last big launches were stressful. How have similar launches gone here, and what should we do this time?",
  },
  {
    label: "Price increase with notice",
    message: "We plan to raise Pro plan prices by 15% in January. This time we can give customers 90 days' notice and keep current customers on today's price for a year. Has a price change like this worked before, and what is different now?",
  },
  {
    label: "Singapore data center",
    message: "We are considering a Singapore data center to meet local data residency rules for two prospects. Have we done anything like this before?",
  },
];

// Conversations created by scripts/seed-conversations.ts. They differ from the suggested prompts so the sidebar looks like earlier use.
export const demoConversations: readonly { label: string; message: string }[] = [
  {
    label: "API v2 retirement",
    message: "We want to retire our v2 webhooks API at the end of the year, and roughly 200 integrators still call it. We sunset v1 before. What went well and badly there, and how should we plan this one?",
  },
  {
    label: "Gateway outage today",
    message: "Our payment gateway failed for about 40 minutes this morning and support is getting a flood of emails. How have we communicated during past outages, and what should we do in the next few hours?",
  },
  {
    label: "NetSuite sync before close",
    message: "Finance wants a NetSuite sync live before the March quarter close. We have built accounting integrations before. What did we learn from them and from cutovers near a close, and is this date realistic?",
  },
];
