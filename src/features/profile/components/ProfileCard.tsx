import { type JSX } from 'solid-js';
import { Card, CardHeader, CardBody } from '@/shared/ui';

interface ProfileCardProps {
  title: string;
  children: JSX.Element;
}

export function ProfileCard(props: ProfileCardProps) {
  return (
    <Card>
      <CardHeader>
        <h2 class="text-lg font-semibold text-gray-900">{props.title}</h2>
      </CardHeader>
      <CardBody>{props.children}</CardBody>
    </Card>
  );
}
