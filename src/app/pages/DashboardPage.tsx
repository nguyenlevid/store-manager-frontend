import { Card, CardBody } from '@/shared/ui';

export default function DashboardPage() {
  return (
    <div class="py-8">
      <h1 class="mb-6 text-3xl font-bold text-gray-900">Dashboard</h1>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardBody>
            <h3 class="mb-2 text-lg font-semibold text-gray-900">
              Total Items
            </h3>
            <p class="text-primary-600 text-3xl font-bold">1,234</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 class="mb-2 text-lg font-semibold text-gray-900">
              Active Transactions
            </h3>
            <p class="text-primary-600 text-3xl font-bold">56</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 class="mb-2 text-lg font-semibold text-gray-900">Partners</h3>
            <p class="text-primary-600 text-3xl font-bold">89</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
