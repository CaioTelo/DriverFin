export const dashboardExample = {
  earning: { platformId: 'UBER', amount: '300.00', rides: 12, hours: '6.00', kilometers: '100.00' },
  expense: { categoryId: 'FUEL', amount: '120.00' },
  expected: { revenue: '300.00', expenses: '120.00', profit: '180.00', margin: '60.00' },
} as const;
