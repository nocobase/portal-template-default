import type { EChartsOption } from "echarts";
import { Activity, BarChart3, ChartPie, TrendingUp, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useDataVisualizationTranslation } from "./i18n";
import { NocoBaseChart } from "./nocobase-chart";
import type { ChartOptionBuilder, ChartQuery } from "./types";

const totalUsersQuery: ChartQuery = {
  uid: "portal-data-visualization:total-users",
  collection: "users",
  measures: [{ field: ["id"], aggregation: "count", alias: "count" }],
  cache: { enabled: true, ttl: 30 },
};

const usersByMonthQuery: ChartQuery = {
  uid: "portal-data-visualization:users-by-month",
  collection: "users",
  measures: [{ field: ["id"], aggregation: "count", alias: "count" }],
  dimensions: [{ field: ["createdAt"], format: "YYYY-MM", alias: "month" }],
  orders: [{ field: ["createdAt"], alias: "month", order: "asc" }],
  cache: { enabled: true, ttl: 30 },
};

const createTotalUsersOption = (label: string): ChartOptionBuilder =>
  (rows): EChartsOption => {
    const value = Number(rows[0]?.count ?? 0);
    return {
      title: {
        text: new Intl.NumberFormat().format(value),
        subtext: label,
        left: "center",
        top: "34%",
        textStyle: { fontSize: 42, fontWeight: 700, color: "#6366f1" },
        subtextStyle: { fontSize: 14, color: "#71717a" },
      },
      series: [
        {
          type: "pie",
          radius: ["72%", "78%"],
          center: ["50%", "50%"],
          silent: true,
          label: { show: false },
          data: [{ value: 1, itemStyle: { color: "#6366f1" } }],
        },
      ],
    };
  };

const createBarOption = (seriesName: string): ChartOptionBuilder =>
  (rows): EChartsOption => ({
    grid: { left: 24, right: 24, top: 36, bottom: 12, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: rows.map((row) => String(row.month ?? "")),
      axisLabel: { color: "#737373" },
    },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: "#737373" } },
    series: [
      {
        name: seriesName,
        type: "bar",
        data: rows.map((row) => Number(row.count ?? 0)),
        itemStyle: { color: "#6366f1", borderRadius: [6, 6, 0, 0] },
      },
    ],
  });

const createTrendOption = (seriesName: string): ChartOptionBuilder =>
  (rows): EChartsOption => ({
    grid: { left: 24, right: 24, top: 36, bottom: 12, containLabel: true },
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: rows.map((row) => String(row.month ?? "")),
      axisLabel: { color: "#737373" },
    },
    yAxis: { type: "value", minInterval: 1, axisLabel: { color: "#737373" } },
    series: [
      {
        name: seriesName,
        type: "line",
        smooth: true,
        symbolSize: 8,
        data: rows.map((row) => Number(row.count ?? 0)),
        lineStyle: { width: 3, color: "#0ea5e9" },
        itemStyle: { color: "#0ea5e9" },
        areaStyle: { color: "rgba(14, 165, 233, 0.18)" },
      },
    ],
  });

const createDoughnutOption = (seriesName: string): ChartOptionBuilder =>
  (rows): EChartsOption => ({
    tooltip: { trigger: "item" },
    legend: { type: "scroll", bottom: 0 },
    series: [
      {
        name: seriesName,
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        itemStyle: { borderColor: "#fff", borderRadius: 5, borderWidth: 2 },
        label: { formatter: "{b}: {c}" },
        data: rows.map((row) => ({
          name: String(row.month ?? ""),
          value: Number(row.count ?? 0),
        })),
      },
    ],
  });

export default function DataVisualizationDemoPage() {
  const t = useDataVisualizationTranslation();
  const usersLabel = t("demo.users", "Users");

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-2">
        <Badge variant="secondary">
          <BarChart3 />
          {t("navigation.title", "Data visualization")}
        </Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("demo.title", "Data visualization")}
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          {t(
            "demo.description",
            "Query aggregate data through the NocoBase chart API and render it with ECharts."
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users />
              {t("demo.totalUsers", "Total users")}
            </CardTitle>
            <CardDescription>{t("demo.metricDescription", "Single aggregate metric")}</CardDescription>
          </CardHeader>
          <CardContent>
            <NocoBaseChart
              query={totalUsersQuery}
              option={createTotalUsersOption(t("demo.totalUsers", "Total users"))}
              height={260}
              ariaLabel={t("demo.totalUsers", "Total users")}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 />
              {t("demo.monthlyBar", "Monthly user registrations")}
            </CardTitle>
            <CardDescription>{t("demo.barDescription", "Category comparison with a bar chart")}</CardDescription>
          </CardHeader>
          <CardContent>
            <NocoBaseChart
              query={usersByMonthQuery}
              option={createBarOption(usersLabel)}
              height={300}
              ariaLabel={t("demo.monthlyBar", "Monthly user registrations")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp />
              {t("demo.registrationTrend", "Registration trend")}
            </CardTitle>
            <CardDescription>{t("demo.trendDescription", "Time-series trend with an area line")}</CardDescription>
          </CardHeader>
          <CardContent>
            <NocoBaseChart
              query={usersByMonthQuery}
              option={createTrendOption(usersLabel)}
              height={320}
              ariaLabel={t("demo.registrationTrend", "Registration trend")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartPie />
              {t("demo.monthlyShare", "Monthly registration share")}
            </CardTitle>
            <CardDescription>{t("demo.pieDescription", "Proportion comparison with a doughnut chart")}</CardDescription>
          </CardHeader>
          <CardContent>
            <NocoBaseChart
              query={usersByMonthQuery}
              option={createDoughnutOption(usersLabel)}
              height={320}
              ariaLabel={t("demo.monthlyShare", "Monthly registration share")}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity />
            {t("demo.protocol", "Shared query protocol")}
          </CardTitle>
          <CardDescription>
            {t(
              "demo.protocolDescription",
              "All examples use charts:queryData. The same rows can be presented with different ECharts option builders."
            )}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
