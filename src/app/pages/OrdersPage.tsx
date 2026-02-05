import { Card, CardBody } from '@/shared/ui';

export default function OrdersPage() {
  return (
    <div class="py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Customer Orders</h1>
        <p class="mt-2 text-sm text-gray-600">
          Track and manage orders from your customers
        </p>
      </div>

      <Card>
        <CardBody>
          <div class="py-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">
              Customer Orders
            </h3>
            <p class="mt-2 text-sm text-gray-500">
              Coming soon: View and manage all customer orders
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
