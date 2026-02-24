export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-status-warning-bg text-status-warning-text';
    case 'completed':
      return 'bg-status-success-bg text-status-success-text';
    case 'cancelled':
      return 'bg-status-danger-bg text-status-danger-text';
    default:
      return 'bg-bg-subtle text-text-secondary';
  }
}
