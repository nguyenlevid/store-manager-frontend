import { Card, CardBody } from '@/shared/ui';

export default function ImportsPage() {
  return (
    <div class="py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Imports</h1>
        <p class="mt-2 text-sm text-gray-600">
          Manage purchase orders to restock your inventory
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">
              Import Management
            </h3>
            <p class="mt-2 text-sm text-gray-500">
              Coming soon: Track purchase orders and restock items
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
