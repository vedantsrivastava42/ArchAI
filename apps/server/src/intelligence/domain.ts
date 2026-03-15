/**
 * Domain detection (LLM) and static domain upgrade suggestions.
 */
export const DOMAIN_SUGGESTIONS: Record<string, string[]> = {
  EdTech: [
    "Student progress tracking",
    "Instructor notification system",
    "Quiz engine",
    "Live class streaming",
    "Certificate generation",
  ],
  "E-commerce": [
    "Recommendation system",
    "Inventory management",
    "Order tracking",
    "Wishlist",
    "Dynamic pricing",
  ],
  "Social Platform": [
    "Feed ranking algorithm",
    "Notification center",
    "Content moderation",
    "Realtime chat",
    "Trending system",
  ],
  "SaaS": [
    "Multi-tenancy",
    "Usage analytics",
    "Billing and subscriptions",
    "SSO / SAML",
    "Audit logs",
  ],
  "DevTools": [
    "Plugin system",
    "CLI with rich output",
    "Documentation generation",
    "CI templates",
    "Metrics and tracing",
  ],
  Default: [
    "Add caching layer for scalability",
    "Implement background job queue",
    "Introduce analytics dashboard",
    "Add comprehensive tests",
    "Improve error handling and monitoring",
  ],
};

export function getDomainSuggestions(domain: string | undefined): string[] {
  if (!domain) return DOMAIN_SUGGESTIONS.Default;
  const key = domain.trim();
  return DOMAIN_SUGGESTIONS[key] ?? DOMAIN_SUGGESTIONS.Default;
}
