import { Card, CardBody, CardHeader } from '@/shared/ui';

export default function SettingsPage() {
  return (
    <div class="py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="mt-2 text-sm text-gray-600">
          Manage your application settings and preferences
        </p>
      </div>

      <div class="space-y-6">
        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-gray-900">
              General Settings
            </h2>
          </CardHeader>
          <CardBody>
            <p class="text-sm text-gray-500">
              Coming soon: Configure general application settings
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-gray-900">Notifications</h2>
          </CardHeader>
          <CardBody>
            <p class="text-sm text-gray-500">
              Coming soon: Configure notification preferences
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 class="text-lg font-semibold text-gray-900">Security</h2>
          </CardHeader>
          <CardBody>
            <p class="text-sm text-gray-500">
              Coming soon: Manage security settings
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
