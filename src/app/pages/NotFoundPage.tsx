import { A } from '@solidjs/router';
import { Card, CardBody, Button } from '@/shared/ui';

export default function NotFoundPage() {
  return (
    <div class="flex min-h-screen items-center justify-center">
      <Card class="max-w-md">
        <CardBody class="text-center">
          <h1 class="mb-4 text-6xl font-bold text-gray-900">404</h1>
          <p class="mb-6 text-xl text-gray-600">Page not found</p>
          <p class="mb-8 text-gray-500">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <A href="/">
            <Button>Back to Home</Button>
          </A>
        </CardBody>
      </Card>
    </div>
  );
}
