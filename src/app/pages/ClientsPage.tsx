import { Card, CardBody } from '@/shared/ui';

export default function ClientsPage() {
  return (
    <div class="py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Clients</h1>
        <p class="mt-2 text-sm text-gray-600">
          Manage your customer relationships and contact information
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">
              Client Management
            </h3>
            <p class="mt-2 text-sm text-gray-500">
              Coming soon: View and manage all your clients
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
