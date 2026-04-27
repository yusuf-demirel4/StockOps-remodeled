const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ServiceStatus = {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs?: number;
};

type StatusResponse = {
  overall: string;
  services: ServiceStatus[];
  updatedAt: string;
  incidents: Array<{ title: string; description: string; createdAt: string }>;
};

async function getStatus(): Promise<StatusResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/v1/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    operational: "bg-green-100 text-green-800",
    degraded: "bg-yellow-100 text-yellow-800",
    down: "bg-red-100 text-red-800",
    partial_outage: "bg-yellow-100 text-yellow-800",
  };

  const labels: Record<string, string> = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    partial_outage: "Partial Outage",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-800"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default async function StatusPage() {
  const data = await getStatus();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900">StockOps Status</h1>
        <p className="mt-1 text-sm text-gray-500">Real-time system status</p>
      </div>

      {!data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">Unable to reach the API. The service may be experiencing issues.</p>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-lg border bg-white p-6 text-center shadow-sm">
            <StatusBadge status={data.overall} />
            <p className="mt-2 text-sm text-gray-500">
              Last updated: {new Date(data.updatedAt).toLocaleString()}
            </p>
          </div>

          <div className="space-y-3">
            {data.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between rounded-lg border bg-white px-4 py-3 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">{service.name}</p>
                  {service.latencyMs != null && (
                    <p className="text-xs text-gray-500">{service.latencyMs}ms</p>
                  )}
                </div>
                <StatusBadge status={service.status} />
              </div>
            ))}
          </div>

          {data.incidents.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Active Incidents</h2>
              {data.incidents.map((incident, i) => (
                <div key={i} className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="font-medium text-yellow-800">{incident.title}</p>
                  <p className="mt-1 text-sm text-yellow-700">{incident.description}</p>
                  <p className="mt-1 text-xs text-yellow-600">
                    {new Date(incident.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
