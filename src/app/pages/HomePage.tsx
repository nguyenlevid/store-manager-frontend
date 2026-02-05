import { A } from '@solidjs/router';
import { Card, CardBody, CardHeader } from '@/shared/ui';
import { getUser } from '@/features/auth/store/session.store';

export default function HomePage() {
  const user = getUser();

  return (
    <div class="py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p class="mt-2 text-gray-600">
          Quick overview of your store operations
        </p>
      </div>

      {/* Quick Stats */}
      <div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Items</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">--</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <svg
                  class="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Pending Orders</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">--</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                <svg
                  class="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Active Imports</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">--</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                <svg
                  class="h-6 w-6 text-purple-600"
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
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-gray-600">Total Clients</p>
                <p class="mt-1 text-2xl font-bold text-gray-900">--</p>
              </div>
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
                <svg
                  class="h-6 w-6 text-orange-600"
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
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Quick Actions */}
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </CardHeader>
          <CardBody>
            <div class="space-y-3">
              <A
                href="/inventory"
                class="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <svg
                      class="h-5 w-5 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Add New Item</span>
                </div>
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </A>

              <A
                href="/orders"
                class="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <svg
                      class="h-5 w-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Create Order</span>
                </div>
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </A>

              <A
                href="/clients"
                class="flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50"
              >
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <svg
                      class="h-5 w-5 text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <span class="font-medium text-gray-900">Add New Client</span>
                </div>
                <svg
                  class="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </A>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </CardHeader>
          <CardBody>
            <div class="py-8 text-center text-gray-500">
              <p class="text-sm">No recent activity</p>
              <p class="mt-1 text-xs">Activity will appear here</p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
