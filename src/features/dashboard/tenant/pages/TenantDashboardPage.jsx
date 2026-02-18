import { Link } from 'react-router-dom'

import { Button, Card, CardBody, CardHeader, CardTitle } from '@/components/ui'

export function TenantDashboardPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Tenant Dashboard</h1>
        <p className="text-sm text-slate-600">Track your rental activity, applications, and payments.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-600">Submit and monitor your rental applications in one place.</p>
          <Link to="/dashboard/tenant/applications">
            <Button size="sm">Open My Applications</Button>
          </Link>
        </CardBody>
      </Card>
    </div>
  )
}
