export type DataSourceMode = "demo" | "database";

export function getDataSourceMode(): DataSourceMode {
  return process.env.APP_DATA_SOURCE === "database" ? "database" : "demo";
}

export function isDatabaseMode() {
  return getDataSourceMode() === "database";
}
